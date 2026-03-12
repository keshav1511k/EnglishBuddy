import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createPracticeSession,
  createUser,
  getDashboardForUser,
  getStoreProviderName,
  getSessionsForUser,
  getUserByToken,
  loginUser,
  logoutUser,
} from "./store.js";

async function run() {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "englishbuddy-"));
  const storePath = path.join(tempDirectory, "store.json");
  delete process.env.MONGODB_URI;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  process.env.ENGLISH_BUDDY_STORE_PATH = storePath;

  try {
    assert.equal(getStoreProviderName(), "local-json");

    const registration = await createUser({
      name: "Keshav",
      email: "keshav@example.com",
      password: "secret123",
      level: "Intermediate",
      weeklyGoalMinutes: 90,
    });
    assert.equal(registration.user.name, "Keshav");
    assert.ok(registration.token);

    const authedUser = await getUserByToken(registration.token);
    assert.equal(authedUser.email, "keshav@example.com");

    await createPracticeSession(registration.user.id, {
      topic: "Job interview",
      speakingMode: "Interview",
      durationMinutes: 20,
      score: 8,
      notes: "Felt more confident in answers.",
    });

    const sessions = await getSessionsForUser(registration.user.id);
    assert.equal(sessions.length, 1);

    const dashboard = await getDashboardForUser(registration.user.id);
    assert.equal(dashboard.summary.totalSessions, 1);
    assert.equal(dashboard.summary.totalMinutes, 20);

    const login = await loginUser({
      email: "keshav@example.com",
      password: "secret123",
    });
    assert.equal(login.user.email, "keshav@example.com");
    assert.ok(login.token);

    await logoutUser(login.token);
    const loggedOutUser = await getUserByToken(login.token);
    assert.equal(loggedOutUser, null);

    process.env.VERCEL = "1";
    delete process.env.ENGLISH_BUDDY_STORE_PATH;
    assert.equal(getStoreProviderName(), "vercel-requires-mongodb");

    console.log("Backend smoke test passed.");
  } finally {
    delete process.env.MONGODB_URI;
    delete process.env.ENGLISH_BUDDY_STORE_PATH;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
