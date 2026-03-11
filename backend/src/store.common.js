import { createHash } from "node:crypto";

export function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

function toIsoString(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;

  return {
    ...safeUser,
    weeklyGoalMinutes: Number(safeUser.weeklyGoalMinutes),
    createdAt: toIsoString(safeUser.createdAt),
  };
}

export function normalizeSession(session) {
  return {
    ...session,
    durationMinutes: Number(session.durationMinutes),
    score: Number(session.score),
    createdAt: toIsoString(session.createdAt),
  };
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = start.getUTCDay();
  const distance = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - distance);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function getDateLabel(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function calculateStreak(sessions) {
  if (!sessions.length) {
    return 0;
  }

  const uniqueDays = [...new Set(sessions.map((entry) => getDateLabel(entry.createdAt)))];
  uniqueDays.sort().reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  for (const dayLabel of uniqueDays) {
    const cursorLabel = cursor.toISOString().slice(0, 10);

    if (dayLabel !== cursorLabel) {
      if (streak === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);

        if (dayLabel !== cursor.toISOString().slice(0, 10)) {
          break;
        }
      } else {
        break;
      }
    }

    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function buildDashboardPayload(user, sessions) {
  const profile = sanitizeUser(user);
  const normalizedSessions = sessions
    .map(normalizeSession)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

  const totalMinutes = normalizedSessions.reduce(
    (sum, session) => sum + session.durationMinutes,
    0,
  );
  const averageScore = normalizedSessions.length
    ? Number(
        (
          normalizedSessions.reduce((sum, session) => sum + session.score, 0) /
          normalizedSessions.length
        ).toFixed(1),
      )
    : 0;
  const currentWeekStart = startOfWeek(new Date());
  const weeklyMinutes = normalizedSessions
    .filter((entry) => new Date(entry.createdAt) >= currentWeekStart)
    .reduce((sum, session) => sum + session.durationMinutes, 0);
  const weeklyGoalProgress = Math.min(
    100,
    Math.round((weeklyMinutes / profile.weeklyGoalMinutes) * 100) || 0,
  );

  const modeBreakdown = normalizedSessions.reduce((summary, session) => {
    summary[session.speakingMode] = (summary[session.speakingMode] || 0) + 1;
    return summary;
  }, {});

  const topicBreakdown = normalizedSessions.reduce((summary, session) => {
    summary[session.topic] = (summary[session.topic] || 0) + session.durationMinutes;
    return summary;
  }, {});

  const topTopics = Object.entries(topicBreakdown)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([topic, minutes]) => ({ topic, minutes }));

  const recommendations = [];

  if (!normalizedSessions.length) {
    recommendations.push("Start with a 10 minute self-introduction session.");
    recommendations.push("Log every practice block so your progress becomes measurable.");
  } else {
    if (weeklyMinutes < profile.weeklyGoalMinutes) {
      recommendations.push(
        `You are ${profile.weeklyGoalMinutes - weeklyMinutes} minutes away from this week's goal.`,
      );
    }

    if (!modeBreakdown.Pronunciation) {
      recommendations.push("Add a pronunciation session to balance your speaking practice.");
    }

    if (averageScore < 7) {
      recommendations.push("Repeat one familiar topic and focus on slower, clearer delivery.");
    }
  }

  return {
    profile,
    summary: {
      totalSessions: normalizedSessions.length,
      totalMinutes,
      averageScore,
      weeklyMinutes,
      weeklyGoalMinutes: profile.weeklyGoalMinutes,
      weeklyGoalProgress,
      streakDays: calculateStreak(normalizedSessions),
    },
    breakdown: {
      modes: modeBreakdown,
      topTopics,
    },
    recentSessions: normalizedSessions.slice(0, 5),
    recommendations,
  };
}
