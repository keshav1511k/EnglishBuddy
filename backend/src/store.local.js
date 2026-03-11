import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  buildDashboardPayload,
  hashPassword,
  normalizeSession,
  sanitizeUser,
} from "./store.common.js";

const EMPTY_STORE = {
  users: [],
  tokens: [],
  sessions: [],
};

const fileName = fileURLToPath(import.meta.url);
const directoryName = path.dirname(fileName);

let mutationQueue = Promise.resolve();

function getStorePath() {
  return (
    process.env.ENGLISH_BUDDY_STORE_PATH ||
    path.resolve(directoryName, "../data/store.json")
  );
}

async function ensureStoreFile() {
  const storePath = getStorePath();
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(EMPTY_STORE, null, 2));
  }

  return storePath;
}

async function readStore() {
  const storePath = await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");

  if (!raw.trim()) {
    return structuredClone(EMPTY_STORE);
  }

  const parsed = JSON.parse(raw);

  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    tokens: Array.isArray(parsed.tokens) ? parsed.tokens : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
  };
}

async function writeStore(store) {
  const storePath = await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

function queueMutation(mutator) {
  const operation = mutationQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    const nextStore = result?.store ?? store;

    await writeStore(nextStore);

    return result?.value;
  });

  mutationQueue = operation.catch(() => undefined);

  return operation;
}

export async function initialize() {
  await ensureStoreFile();
}

export async function createUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const user = {
    id: randomUUID(),
    name: payload.name.trim(),
    email,
    level: payload.level,
    weeklyGoalMinutes: payload.weeklyGoalMinutes,
    passwordHash: hashPassword(payload.password),
    createdAt: new Date().toISOString(),
  };

  return queueMutation((store) => {
    const existingUser = store.users.find((entry) => entry.email === email);

    if (existingUser) {
      const error = new Error("An account with this email already exists.");
      error.statusCode = 409;
      throw error;
    }

    const token = randomUUID();
    const nextStore = {
      ...store,
      users: [...store.users, user],
      tokens: [
        ...store.tokens,
        {
          token,
          userId: user.id,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    return {
      store: nextStore,
      value: {
        token,
        user: sanitizeUser(user),
      },
    };
  });
}

export async function loginUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const passwordHash = hashPassword(payload.password);

  return queueMutation((store) => {
    const user = store.users.find((entry) => entry.email === email);

    if (!user || user.passwordHash !== passwordHash) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      throw error;
    }

    const token = randomUUID();
    const nextStore = {
      ...store,
      tokens: [
        ...store.tokens,
        {
          token,
          userId: user.id,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    return {
      store: nextStore,
      value: {
        token,
        user: sanitizeUser(user),
      },
    };
  });
}

export async function getUserByToken(token) {
  const store = await readStore();
  const session = store.tokens.find((entry) => entry.token === token);

  if (!session) {
    return null;
  }

  const user = store.users.find((entry) => entry.id === session.userId);

  return user ? sanitizeUser(user) : null;
}

export async function logoutUser(token) {
  return queueMutation((store) => ({
    store: {
      ...store,
      tokens: store.tokens.filter((entry) => entry.token !== token),
    },
    value: true,
  }));
}

export async function createPracticeSession(userId, payload) {
  const session = {
    id: randomUUID(),
    userId,
    topic: payload.topic.trim(),
    speakingMode: payload.speakingMode,
    durationMinutes: payload.durationMinutes,
    score: payload.score,
    notes: payload.notes.trim(),
    createdAt: new Date().toISOString(),
  };

  return queueMutation((store) => ({
    store: {
      ...store,
      sessions: [...store.sessions, session],
    },
    value: normalizeSession(session),
  }));
}

export async function getSessionsForUser(userId) {
  const store = await readStore();

  return store.sessions
    .filter((entry) => entry.userId === userId)
    .map(normalizeSession)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export async function getDashboardForUser(userId) {
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const sessions = store.sessions.filter((entry) => entry.userId === userId);
  return buildDashboardPayload(user, sessions);
}
