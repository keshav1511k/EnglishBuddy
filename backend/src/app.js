import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPracticeSummary, createPracticeTurn } from "./ai.js";
import {
  createPracticeSession,
  createUser,
  getStoreProviderName,
  getDashboardForUser,
  getSessionsForUser,
  getUserByToken,
  loginUser,
  logoutUser,
} from "./store.js";

const fileName = fileURLToPath(import.meta.url);
const directoryName = path.dirname(fileName);
const frontendDistPath = path.resolve(directoryName, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasBuiltFrontend = existsSync(frontendIndexPath);

function parseWeeklyGoal(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

function parseScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10 ? parsed : NaN;
}

function parseDuration(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 5 && parsed <= 180 ? parsed : NaN;
}

function parseConversationDuration(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 180 ? parsed : NaN;
}

function getAuthToken(request) {
  const header = request.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

async function requireAuth(request, response, next) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      response.status(401).json({ message: "Missing auth token." });
      return;
    }

    const user = await getUserByToken(token);

    if (!user) {
      response.status(401).json({ message: "Session expired. Please log in again." });
      return;
    }

    request.user = user;
    request.token = token;
    next();
  } catch (error) {
    next(error);
  }
}

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (request, response) => {
    response.json({
      status: "ok",
      storage: getStoreProviderName(),
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/auth/register", async (request, response) => {
    const { name, email, password, level, weeklyGoalMinutes } = request.body ?? {};

    if (!name?.trim() || !email?.trim() || !password?.trim() || !level?.trim()) {
      response.status(400).json({ message: "Name, email, password, and level are required." });
      return;
    }

    const parsedGoal = parseWeeklyGoal(weeklyGoalMinutes);

    if (!Number.isFinite(parsedGoal)) {
      response.status(400).json({ message: "Weekly goal must be a positive number of minutes." });
      return;
    }

    if (password.trim().length < 6) {
      response.status(400).json({ message: "Password must be at least 6 characters long." });
      return;
    }

    const result = await createUser({
      name,
      email,
      password,
      level: level.trim(),
      weeklyGoalMinutes: parsedGoal,
    });

    response.status(201).json(result);
  });

  app.post("/api/auth/login", async (request, response) => {
    const { email, password } = request.body ?? {};

    if (!email?.trim() || !password?.trim()) {
      response.status(400).json({ message: "Email and password are required." });
      return;
    }

    const result = await loginUser({ email, password });
    response.json(result);
  });

  app.post("/api/auth/logout", requireAuth, async (request, response) => {
    await logoutUser(request.token);
    response.status(204).send();
  });

  app.get("/api/me/dashboard", requireAuth, async (request, response) => {
    const dashboard = await getDashboardForUser(request.user.id);
    response.json(dashboard);
  });

  app.get("/api/me/sessions", requireAuth, async (request, response) => {
    const sessions = await getSessionsForUser(request.user.id);
    response.json({ sessions });
  });

  app.post("/api/me/sessions", requireAuth, async (request, response) => {
    const { topic, speakingMode, durationMinutes, score, notes = "" } = request.body ?? {};

    if (!topic?.trim() || !speakingMode?.trim()) {
      response.status(400).json({ message: "Topic and speaking mode are required." });
      return;
    }

    const parsedDuration = parseDuration(durationMinutes);
    const parsedScore = parseScore(score);

    if (!Number.isFinite(parsedDuration)) {
      response
        .status(400)
        .json({ message: "Duration must be between 5 and 180 minutes." });
      return;
    }

    if (!Number.isFinite(parsedScore)) {
      response.status(400).json({ message: "Score must be between 1 and 10." });
      return;
    }

    const session = await createPracticeSession(request.user.id, {
      topic,
      speakingMode: speakingMode.trim(),
      durationMinutes: parsedDuration,
      score: parsedScore,
      notes: String(notes ?? ""),
    });

    response.status(201).json({ session });
  });

  app.post("/api/ai/practice-turn", requireAuth, async (request, response) => {
    const {
      topic,
      focusArea = "fluency",
      conversationMode = "Conversation",
      history = [],
      userMessage,
    } = request.body ?? {};

    if (!topic?.trim() || !userMessage?.trim()) {
      response.status(400).json({ message: "Topic and user message are required." });
      return;
    }

    const aiTurn = await createPracticeTurn({
      user: request.user,
      topic,
      focusArea: String(focusArea),
      conversationMode: String(conversationMode),
      history,
      userMessage,
    });

    response.json(aiTurn);
  });

  app.post("/api/ai/practice-summary", requireAuth, async (request, response) => {
    const {
      topic,
      focusArea = "fluency",
      conversationMode = "Conversation",
      history = [],
      durationMinutes,
    } = request.body ?? {};

    if (!topic?.trim()) {
      response.status(400).json({ message: "Topic is required." });
      return;
    }

    const parsedDuration = parseConversationDuration(durationMinutes);

    if (!Number.isFinite(parsedDuration)) {
      response.status(400).json({ message: "Duration must be between 1 and 180 minutes." });
      return;
    }

    const summary = await createPracticeSummary({
      user: request.user,
      topic,
      focusArea: String(focusArea),
      conversationMode: String(conversationMode),
      history,
      durationMinutes: parsedDuration,
    });

    response.json({ summary });
  });

  if (hasBuiltFrontend) {
    app.use(express.static(frontendDistPath));

    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api")) {
        next();
        return;
      }

      response.sendFile(frontendIndexPath);
    });
  } else {
    app.get("/", (request, response) => {
      response.send("EnglishBuddy Backend Running");
    });
  }

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    response.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong.",
    });
  });

  return app;
}
