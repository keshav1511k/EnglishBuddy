import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  buildDashboardPayload,
  hashPassword,
  normalizeSession,
  sanitizeUser,
} from "./store.common.js";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true },
    level: { type: String, required: true, trim: true },
    weeklyGoalMinutes: { type: Number, required: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

const tokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

const sessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    topic: { type: String, required: true, trim: true },
    speakingMode: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true },
    score: { type: Number, required: true },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

const User =
  mongoose.models.EnglishBuddyUser ||
  mongoose.model("EnglishBuddyUser", userSchema);
const Token =
  mongoose.models.EnglishBuddyToken ||
  mongoose.model("EnglishBuddyToken", tokenSchema);
const Session =
  mongoose.models.EnglishBuddySession ||
  mongoose.model("EnglishBuddySession", sessionSchema);

let connectionPromise;

export async function initialize() {
  if (!process.env.MONGODB_URI) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      })
      .then(async () => {
        await Promise.all([User.init(), Token.init(), Session.init()]);
      });
  }

  return connectionPromise;
}

function handleDuplicateKey(error) {
  if (error?.code === 11000) {
    const duplicateError = new Error("An account with this email already exists.");
    duplicateError.statusCode = 409;
    throw duplicateError;
  }

  throw error;
}

export async function createUser(payload) {
  await initialize();

  const email = payload.email.trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create({
      id: randomUUID(),
      name: payload.name.trim(),
      email,
      level: payload.level,
      weeklyGoalMinutes: payload.weeklyGoalMinutes,
      passwordHash: hashPassword(payload.password),
      createdAt: new Date(),
    });

    const tokenValue = randomUUID();
    await Token.create({
      token: tokenValue,
      userId: user.id,
      createdAt: new Date(),
    });

    return {
      token: tokenValue,
      user: sanitizeUser(user.toObject()),
    };
  } catch (error) {
    handleDuplicateKey(error);
  }
}

export async function loginUser(payload) {
  await initialize();

  const email = payload.email.trim().toLowerCase();
  const passwordHash = hashPassword(payload.password);
  const user = await User.findOne({ email }).lean();

  if (!user || user.passwordHash !== passwordHash) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  const tokenValue = randomUUID();
  await Token.create({
    token: tokenValue,
    userId: user.id,
    createdAt: new Date(),
  });

  return {
    token: tokenValue,
    user: sanitizeUser(user),
  };
}

export async function getUserByToken(token) {
  await initialize();

  const session = await Token.findOne({ token }).lean();

  if (!session) {
    return null;
  }

  const user = await User.findOne({ id: session.userId }).lean();
  return user ? sanitizeUser(user) : null;
}

export async function logoutUser(token) {
  await initialize();
  await Token.deleteOne({ token });
  return true;
}

export async function createPracticeSession(userId, payload) {
  await initialize();

  const session = await Session.create({
    id: randomUUID(),
    userId,
    topic: payload.topic.trim(),
    speakingMode: payload.speakingMode,
    durationMinutes: payload.durationMinutes,
    score: payload.score,
    notes: payload.notes.trim(),
    createdAt: new Date(),
  });

  return normalizeSession(session.toObject());
}

export async function getSessionsForUser(userId) {
  await initialize();

  const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).lean();
  return sessions.map(normalizeSession);
}

export async function getDashboardForUser(userId) {
  await initialize();

  const user = await User.findOne({ id: userId }).lean();

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).lean();
  return buildDashboardPayload(user, sessions);
}
