import OpenAI from "openai";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function isAiPracticeConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

const practiceTurnSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistantReply: { type: "string" },
    feedback: {
      type: "object",
      additionalProperties: false,
      properties: {
        quickFeedback: { type: "string" },
        grammarTip: { type: "string" },
        vocabularyTip: { type: "string" },
        betterVersion: { type: "string" },
        confidenceScore: {
          type: "integer",
          minimum: 1,
          maximum: 10,
        },
      },
      required: [
        "quickFeedback",
        "grammarTip",
        "vocabularyTip",
        "betterVersion",
        "confidenceScore",
      ],
    },
  },
  required: ["assistantReply", "feedback"],
};

const practiceSummarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallFeedback: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    improvementAreas: {
      type: "array",
      items: { type: "string" },
    },
    nextPracticePrompt: { type: "string" },
    suggestedNotes: { type: "string" },
    recommendedSessionScore: {
      type: "integer",
      minimum: 1,
      maximum: 10,
    },
  },
  required: [
    "overallFeedback",
    "strengths",
    "improvementAreas",
    "nextPracticePrompt",
    "suggestedNotes",
    "recommendedSessionScore",
  ],
};

function getClient() {
  if (!isAiPracticeConfigured()) {
    const error = new Error("Live AI is not enabled on this deployment yet.");
    error.statusCode = 503;
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (entry) =>
        (entry?.role === "user" || entry?.role === "assistant") &&
        typeof entry?.content === "string" &&
        entry.content.trim(),
    )
    .slice(-12)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim().slice(0, 1000),
    }));
}

function formatHistory(history) {
  if (!history.length) {
    return "No previous turns yet.";
  }

  return history
    .map((entry) =>
      `${entry.role === "assistant" ? "Coach" : "Learner"}: ${entry.content}`,
    )
    .join("\n");
}

async function createStructuredResponse({ instructions, prompt, schema, schemaName }) {
  const client = getClient();
  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    instructions,
    input: prompt,
    max_output_tokens: 700,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });

  try {
    return JSON.parse(response.output_text);
  } catch {
    const error = new Error("AI returned an unexpected response.");
    error.statusCode = 502;
    throw error;
  }
}

export async function createPracticeTurn({
  user,
  topic,
  focusArea,
  conversationMode,
  history,
  userMessage,
}) {
  const cleanHistory = sanitizeHistory(history);

  return createStructuredResponse({
    instructions: [
      "You are EnglishBuddy, a live spoken-English coach for adult learners.",
      "Act like a real conversation partner, not a lecturer.",
      "Reply in 2 to 4 short sentences and ask at most one follow-up question.",
      "Keep the conversation natural and aligned with the learner's level.",
      "Feedback must be supportive, specific, and based only on the transcript, not pronunciation audio.",
      "Do not mention JSON or formatting in the reply.",
    ].join(" "),
    prompt: [
      `Learner name: ${user.name}`,
      `Learner level: ${user.level}`,
      `Weekly goal minutes: ${user.weeklyGoalMinutes}`,
      `Practice topic: ${topic.trim()}`,
      `Conversation mode: ${conversationMode.trim()}`,
      `Primary focus area: ${focusArea.trim()}`,
      `Conversation history:\n${formatHistory(cleanHistory)}`,
      `Latest learner message: ${userMessage.trim()}`,
      "Return an assistant reply and concise speaking feedback.",
    ].join("\n\n"),
    schema: practiceTurnSchema,
    schemaName: "englishbuddy_practice_turn",
  });
}

export async function createPracticeSummary({
  user,
  topic,
  focusArea,
  conversationMode,
  history,
  durationMinutes,
}) {
  const cleanHistory = sanitizeHistory(history);

  return createStructuredResponse({
    instructions: [
      "You are EnglishBuddy, an English speaking coach reviewing a practice session.",
      "Evaluate transcript quality only.",
      "Give honest but motivating feedback for grammar, fluency, vocabulary, and clarity.",
      "Do not claim to have heard pronunciation details that are not present in text.",
      "Keep strengths and improvement areas practical and concise.",
    ].join(" "),
    prompt: [
      `Learner name: ${user.name}`,
      `Learner level: ${user.level}`,
      `Practice topic: ${topic.trim()}`,
      `Conversation mode: ${conversationMode.trim()}`,
      `Focus area: ${focusArea.trim()}`,
      `Approximate duration: ${durationMinutes} minutes`,
      `Transcript:\n${formatHistory(cleanHistory)}`,
      "Return a session review and a recommended score for saving this session.",
    ].join("\n\n"),
    schema: practiceSummarySchema,
    schemaName: "englishbuddy_practice_summary",
  });
}
