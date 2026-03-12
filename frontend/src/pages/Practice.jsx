import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  createSession,
  fetchHealth,
  requestPracticeSummary,
  requestPracticeTurn,
} from "../services/api";

const starterMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I’m your EnglishBuddy AI coach. Pick a topic, press the mic, and speak in English. I’ll reply like a conversation partner and coach you after each turn.",
};

const focusAreas = [
  { label: "Fluency", value: "fluency" },
  { label: "Grammar", value: "grammar" },
  { label: "Vocabulary", value: "vocabulary" },
  { label: "Confidence", value: "confidence" },
];

const conversationModes = [
  "Conversation",
  "Interview",
  "Storytelling",
  "Presentation",
];

const aiUnavailableMessage =
  "Live AI is not enabled on this site yet. Add the OpenAI API key in Render to turn it on.";

function createMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function formatDuration(startedAt) {
  if (!startedAt) {
    return 1;
  }

  return Math.max(1, Math.round((Date.now() - startedAt) / 60000));
}

function getConversationStatus({
  isAiConfigured,
  isCheckingAi,
  isListening,
  isReplying,
  isSummarizing,
}) {
  if (isCheckingAi) {
    return "Checking AI setup";
  }

  if (!isAiConfigured) {
    return "AI setup needed";
  }

  if (isListening) {
    return "Listening to you";
  }

  if (isReplying) {
    return "AI is responding";
  }

  if (isSummarizing) {
    return "Preparing session feedback";
  }

  return "Ready for the next turn";
}

export default function Practice({ session }) {
  const recognitionRef = useRef(null);
  const speechBufferRef = useRef("");
  const sendMessageRef = useRef(null);

  const [topic, setTopic] = useState("Self introduction");
  const [focusArea, setFocusArea] = useState("fluency");
  const [conversationMode, setConversationMode] = useState("Conversation");
  const [messages, setMessages] = useState([starterMessage]);
  const [manualMessage, setManualMessage] = useState("");
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [lastFeedback, setLastFeedback] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [savedSessionId, setSavedSessionId] = useState(null);
  const [isAiConfigured, setIsAiConfigured] = useState(true);
  const [isCheckingAi, setIsCheckingAi] = useState(true);

  const speechRecognition = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const speechSynthesisAvailable =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((entry) => entry.id !== "welcome")
        .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const speakReply = (text) => {
    if (!speechSynthesisAvailable || !voiceReplyEnabled) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const getReadableError = (requestError) => {
    if (requestError?.code === "AI_NOT_CONFIGURED") {
      return aiUnavailableMessage;
    }

    return requestError?.message || "Something went wrong. Please try again.";
  };

  const handleSendMessage = async (rawMessage) => {
    const cleanMessage = rawMessage.trim();

    if (!cleanMessage || isReplying || isSummarizing) {
      return;
    }

    if (!isAiConfigured) {
      setError(aiUnavailableMessage);
      return;
    }

    if (!sessionStartedAt) {
      setSessionStartedAt(Date.now());
    }

    const historyBeforeSend = conversationHistory;
    const userMessage = createMessage("user", cleanMessage);

    setError("");
    setNotice("");
    setSummary(null);
    setSavedSessionId(null);
    setMessages((current) => [...current, userMessage]);
    setManualMessage("");
    setTranscriptDraft("");
    setIsReplying(true);

    try {
      const response = await requestPracticeTurn({
        topic,
        focusArea,
        conversationMode,
        history: historyBeforeSend,
        userMessage: cleanMessage,
      });

      setMessages((current) => [
        ...current,
        createMessage("assistant", response.assistantReply),
      ]);
      setLastFeedback(response.feedback);
      speakReply(response.assistantReply);
    } catch (requestError) {
      setError(getReadableError(requestError));
    } finally {
      setIsReplying(false);
    }
  };

  sendMessageRef.current = handleSendMessage;

  useEffect(() => {
    let isCancelled = false;

    const loadHealth = async () => {
      try {
        const response = await fetchHealth();

        if (!isCancelled) {
          setIsAiConfigured(response?.ai?.configured !== false);
        }
      } catch {
        if (!isCancelled) {
          setIsAiConfigured(true);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingAi(false);
        }
      }
    };

    void loadHealth();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!speechRecognition) {
      return undefined;
    }

    const recognition = new speechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      speechBufferRef.current = "";
      setTranscriptDraft("");
      setError("");
      setNotice("");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = speechBufferRef.current;
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      speechBufferRef.current = finalTranscript;
      setTranscriptDraft(`${finalTranscript}${interimTranscript}`.trim());
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (event.error !== "no-speech") {
        setError("Microphone input failed. You can still type your answer below.");
      }
    };

    recognition.onend = () => {
      const finalTranscript = speechBufferRef.current.trim();
      speechBufferRef.current = "";
      setIsListening(false);

      if (finalTranscript) {
        void sendMessageRef.current(finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [speechRecognition]);

  useEffect(() => {
    return () => {
      if (speechSynthesisAvailable) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechSynthesisAvailable]);

  const startListening = () => {
    if (!isAiConfigured) {
      setError(aiUnavailableMessage);
      return;
    }

    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isReplying || isSummarizing) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch {
      setError("Microphone is already active. Finish the current recording first.");
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    await handleSendMessage(manualMessage);
  };

  const handleSummarize = async () => {
    if (!conversationHistory.length || isSummarizing) {
      return;
    }

    stopListening();

    if (speechSynthesisAvailable) {
      window.speechSynthesis.cancel();
    }

    setError("");
    setNotice("");
    setIsSummarizing(true);

    try {
      const response = await requestPracticeSummary({
        topic,
        focusArea,
        conversationMode,
        history: conversationHistory,
        durationMinutes: formatDuration(sessionStartedAt),
      });

      setSummary(response.summary);
    } catch (requestError) {
      setError(getReadableError(requestError));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSaveSession = async () => {
    if (!summary || isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await createSession({
        topic,
        speakingMode: "AI Conversation",
        durationMinutes: Math.max(5, formatDuration(sessionStartedAt)),
        score: summary.recommendedSessionScore,
        notes: summary.suggestedNotes,
      });

      setSavedSessionId(response.session.id);
      setNotice("AI practice session saved to your dashboard.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (speechSynthesisAvailable) {
      window.speechSynthesis.cancel();
    }

    stopListening();
    setMessages([starterMessage]);
    setManualMessage("");
    setTranscriptDraft("");
    setLastFeedback(null);
    setSummary(null);
    setError("");
    setNotice("");
    setSessionStartedAt(null);
    setSavedSessionId(null);
  };

  const conversationStatus = getConversationStatus({
    isAiConfigured,
    isCheckingAi,
    isListening,
    isReplying,
    isSummarizing,
  });

  return (
    <main className="page-shell practice-shell">
      <section className="panel practice-hero">
        <div className="section-heading">
          <span className="eyebrow">Live AI coach</span>
          <h1>{`Practice with AI, ${session.user.name}.`}</h1>
          <p>
            Speak naturally, get a real reply, and review instant feedback based on
            what you said.
          </p>
        </div>

        <div className="status-pill">{conversationStatus}</div>

        <div className="hero-actions">
          <button
            className="primary-button"
            type="button"
            onClick={startListening}
            disabled={
              isCheckingAi || !isAiConfigured || isListening || isReplying || isSummarizing
            }
          >
            {isListening ? "Listening..." : "Start voice conversation"}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={stopListening}
            disabled={!isListening}
          >
            Stop mic
          </button>
          <button className="ghost-button" type="button" onClick={handleReset}>
            Reset session
          </button>
        </div>
      </section>

      <section className="content-grid practice-grid">
        <article className="panel setup-panel">
          <div className="section-heading">
            <span className="eyebrow">Session setup</span>
            <h2>Choose what to practice</h2>
          </div>

          <div className="stack-form">
            <label className="field">
              <span>Topic</span>
              <input
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="For example: interview, daily routine, travel"
              />
            </label>

            <label className="field">
              <span>Conversation mode</span>
              <select
                value={conversationMode}
                onChange={(event) => setConversationMode(event.target.value)}
              >
                {conversationModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Primary focus</span>
              <select
                value={focusArea}
                onChange={(event) => setFocusArea(event.target.value)}
              >
                {focusAreas.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={voiceReplyEnabled}
                onChange={(event) => setVoiceReplyEnabled(event.target.checked)}
              />
              <span>Read AI replies aloud</span>
            </label>

            {!speechRecognition ? (
              <div className="empty-card">
                Voice input is not available in this browser. You can still practice by
                typing your answers below.
              </div>
            ) : null}

            {!isCheckingAi && !isAiConfigured ? (
              <div className="empty-card">
                Live AI is not enabled on this deployment yet. Add the OpenAI API key
                in Render, then redeploy to turn on voice practice and feedback.
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel conversation-panel">
          <div className="section-heading">
            <span className="eyebrow">Conversation</span>
            <h2>Talk with your AI coach</h2>
          </div>

          <div className="chat-list">
            {messages.map((message) => (
              <article
                className={`chat-bubble ${message.role === "assistant" ? "is-assistant" : "is-user"}`}
                key={message.id}
              >
                <strong>{message.role === "assistant" ? "AI coach" : "You"}</strong>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          {transcriptDraft ? (
            <div className="transcript-preview">
              <strong>Listening:</strong>
              <span>{transcriptDraft}</span>
            </div>
          ) : null}

          <form className="stack-form" onSubmit={handleManualSubmit}>
            <label className="field">
              <span>Type your answer</span>
              <textarea
                rows="3"
                value={manualMessage}
                onChange={(event) => setManualMessage(event.target.value)}
                placeholder="If the mic is noisy, type your response here."
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={
                isCheckingAi ||
                !isAiConfigured ||
                isReplying ||
                isSummarizing ||
                !manualMessage.trim()
              }
            >
              {isReplying ? "AI is replying..." : "Send answer"}
            </button>
          </form>
        </article>
      </section>

      <section className="content-grid practice-grid">
        <article className="panel feedback-panel">
          <div className="section-heading">
            <span className="eyebrow">Instant feedback</span>
            <h2>What to improve right now</h2>
          </div>

          {lastFeedback ? (
            <div className="feedback-stack">
              <div className="mini-card">
                <strong>{`${lastFeedback.confidenceScore}/10`}</strong>
                <span>Confidence for your last answer</span>
              </div>
              <div className="feedback-detail">
                <h3>Quick feedback</h3>
                <p>{lastFeedback.quickFeedback}</p>
              </div>
              <div className="feedback-detail">
                <h3>Grammar tip</h3>
                <p>{lastFeedback.grammarTip}</p>
              </div>
              <div className="feedback-detail">
                <h3>Vocabulary tip</h3>
                <p>{lastFeedback.vocabularyTip}</p>
              </div>
              <div className="feedback-detail">
                <h3>Better version</h3>
                <p>{lastFeedback.betterVersion}</p>
              </div>
            </div>
          ) : (
            <div className="empty-card">
              Your live coaching will appear here after the first answer.
            </div>
          )}
        </article>

        <article className="panel summary-panel">
          <div className="section-heading">
            <span className="eyebrow">Session review</span>
            <h2>End session and save</h2>
          </div>

          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleSummarize}
              disabled={
                isCheckingAi ||
                !isAiConfigured ||
                !conversationHistory.length ||
                isSummarizing
              }
            >
              {isSummarizing
                ? "Creating summary..."
                : "End conversation and get feedback"}
            </button>

            {summary ? (
              <button
                className="ghost-button"
                type="button"
                onClick={handleSaveSession}
                disabled={isSaving || Boolean(savedSessionId)}
              >
                {savedSessionId
                  ? "Saved"
                  : isSaving
                    ? "Saving..."
                    : "Save to dashboard"}
              </button>
            ) : null}
          </div>

          {summary ? (
            <div className="summary-stack">
              <div className="mini-card">
                <strong>{`${summary.recommendedSessionScore}/10`}</strong>
                <span>Recommended session score</span>
              </div>
              <div className="feedback-detail">
                <h3>Overall feedback</h3>
                <p>{summary.overallFeedback}</p>
              </div>
              <div className="feedback-detail">
                <h3>Strengths</h3>
                <ul className="plain-list">
                  {summary.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="feedback-detail">
                <h3>Improvement areas</h3>
                <ul className="plain-list">
                  {summary.improvementAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="feedback-detail">
                <h3>Suggested next prompt</h3>
                <p>{summary.nextPracticePrompt}</p>
              </div>
            </div>
          ) : (
            <div className="empty-card">
              Finish a few turns, then generate your full session review and save it
              to the dashboard.
            </div>
          )}

          {notice ? <p className="form-message success-message">{notice}</p> : null}
          {error ? <p className="form-message error-message">{error}</p> : null}

          {savedSessionId ? (
            <p className="inline-link-row">
              Session saved. <Link to="/dashboard">Go back to dashboard</Link>
            </p>
          ) : null}
        </article>
      </section>
    </main>
  );
}
