import { useCallback, useEffect, useState } from "react";
import {
  clearSession,
  createSession,
  fetchDashboard,
  fetchSessions,
} from "../services/api";

const initialForm = {
  topic: "Self introduction",
  speakingMode: "Conversation",
  durationMinutes: 15,
  score: 7,
  notes: "",
};

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function StatCard({ label, value, hint }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

async function loadDashboardData() {
  const [dashboardPayload, sessionsPayload] = await Promise.all([
    fetchDashboard(),
    fetchSessions(),
  ]);

  return {
    dashboardPayload,
    sessionsPayload,
  };
}

export default function Dashboard({ onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const { dashboardPayload, sessionsPayload } = await loadDashboardData();

      setDashboard(dashboardPayload);
      setSessions(sessionsPayload.sessions);
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        onLogout();
        return;
      }

      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]:
        name === "durationMinutes" || name === "score" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      await createSession(form);
      setForm(initialForm);
      setNotice("Practice session saved.");
      await loadData();
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        onLogout();
        return;
      }

      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="page-shell dashboard-shell">
        <section className="panel loading-panel">
          <span className="eyebrow">Preparing dashboard</span>
          <h1>Loading your speaking progress...</h1>
        </section>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="page-shell dashboard-shell">
        <section className="panel">
          <h1>Dashboard unavailable</h1>
          <p>{error || "Something went wrong while loading your data."}</p>
        </section>
      </main>
    );
  }

  const { profile, summary, breakdown, recommendations, recentSessions } = dashboard;

  return (
    <main className="page-shell dashboard-shell">
      <section className="panel hero-dashboard">
        <div className="section-heading">
          <span className="eyebrow">Progress overview</span>
          <h1>{`Welcome back, ${profile.name}.`}</h1>
          <p>
            {`You have logged ${summary.totalSessions} practice sessions so far. Keep your speaking momentum visible.`}
          </p>
        </div>

        <div className="progress-callout">
          <strong>{summary.weeklyGoalProgress}%</strong>
          <span>{`${summary.weeklyMinutes} / ${summary.weeklyGoalMinutes} weekly minutes completed`}</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Total sessions"
          value={summary.totalSessions}
          hint="Every speaking block counts."
        />
        <StatCard
          label="Total minutes"
          value={summary.totalMinutes}
          hint="Your cumulative speaking time."
        />
        <StatCard
          label="Average confidence"
          value={`${summary.averageScore}/10`}
          hint="Based on your post-session score."
        />
        <StatCard
          label="Current streak"
          value={`${summary.streakDays} days`}
          hint="Consecutive practice days."
        />
      </section>

      <section className="content-grid">
        <article className="panel composer-panel">
          <div className="section-heading">
            <span className="eyebrow">Log practice</span>
            <h2>Add a new speaking session</h2>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Topic</span>
              <input
                name="topic"
                type="text"
                value={form.topic}
                onChange={handleChange}
                placeholder="For example: daily routine, interview, presentation"
                required
              />
            </label>

            <div className="inline-fields">
              <label className="field">
                <span>Mode</span>
                <select
                  name="speakingMode"
                  value={form.speakingMode}
                  onChange={handleChange}
                >
                  <option value="Conversation">Conversation</option>
                  <option value="Pronunciation">Pronunciation</option>
                  <option value="Storytelling">Storytelling</option>
                  <option value="Interview">Interview</option>
                </select>
              </label>

              <label className="field">
                <span>Minutes</span>
                <input
                  name="durationMinutes"
                  type="number"
                  min="5"
                  max="180"
                  value={form.durationMinutes}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="field">
                <span>Score</span>
                <input
                  name="score"
                  type="number"
                  min="1"
                  max="10"
                  value={form.score}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                name="notes"
                rows="4"
                value={form.notes}
                onChange={handleChange}
                placeholder="What felt easy? What needs another round?"
              />
            </label>

            {error ? <p className="form-message error-message">{error}</p> : null}
            {notice ? <p className="form-message success-message">{notice}</p> : null}

            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "Saving session..." : "Save session"}
            </button>
          </form>
        </article>

        <article className="panel insights-panel">
          <div className="section-heading">
            <span className="eyebrow">Your focus</span>
            <h2>Practice breakdown</h2>
          </div>

          <div className="mini-grid">
            {Object.entries(breakdown.modes).length ? (
              Object.entries(breakdown.modes).map(([mode, count]) => (
                <div className="mini-card" key={mode}>
                  <strong>{count}</strong>
                  <span>{mode}</span>
                </div>
              ))
            ) : (
              <div className="empty-card">
                No modes logged yet. Start with one short conversation session.
              </div>
            )}
          </div>

          <div className="topic-list">
            <h3>Top topics</h3>
            {breakdown.topTopics.length ? (
              breakdown.topTopics.map((topic) => (
                <div className="topic-row" key={topic.topic}>
                  <span>{topic.topic}</span>
                  <strong>{topic.minutes} min</strong>
                </div>
              ))
            ) : (
              <p className="muted-copy">Your most practiced topics will appear here.</p>
            )}
          </div>

          <div className="recommendation-list">
            <h3>Next steps</h3>
            {recommendations.length ? (
              recommendations.map((item) => <p key={item}>{item}</p>)
            ) : (
              <p>Keep logging sessions to unlock better recommendations.</p>
            )}
          </div>
        </article>
      </section>

      <section className="panel history-panel">
        <div className="section-heading">
          <span className="eyebrow">Session history</span>
          <h2>Recent practice entries</h2>
        </div>

        {recentSessions.length ? (
          <div className="session-list">
            {sessions.map((entry) => (
              <article className="session-card" key={entry.id}>
                <div>
                  <span className="session-mode">{entry.speakingMode}</span>
                  <h3>{entry.topic}</h3>
                  <p>{entry.notes || "No notes added for this session."}</p>
                </div>
                <div className="session-meta">
                  <strong>{entry.durationMinutes} min</strong>
                  <span>{`${entry.score}/10 confidence`}</span>
                  <small>{formatDate(entry.createdAt)}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            No practice sessions yet. Add your first entry to start tracking progress.
          </div>
        )}
      </section>
    </main>
  );
}
