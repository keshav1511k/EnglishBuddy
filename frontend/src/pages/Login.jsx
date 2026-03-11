import { useState } from "react";
import { Link } from "react-router-dom";
import { loginUser } from "../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await loginUser({ email, password });
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell auth-shell">
      <section className="hero-panel">
        <span className="eyebrow">English speaking practice</span>
        <h1>Build fluency with short, measurable sessions.</h1>
        <p>
          Track how often you speak, what you practiced, and how confident you felt.
          EnglishBuddy turns practice into a repeatable habit.
        </p>
        <div className="hero-points">
          <div>
            <strong>Structured practice</strong>
            <span>Conversation, pronunciation, interviews, storytelling.</span>
          </div>
          <div>
            <strong>Weekly targets</strong>
            <span>See whether your speaking time is actually growing.</span>
          </div>
          <div>
            <strong>Simple review loop</strong>
            <span>Log notes after every session and spot improvement faster.</span>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <span className="eyebrow">Welcome back</span>
          <h2>Log in to continue</h2>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="form-message error-message">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create your account</Link>
        </p>
      </section>
    </main>
  );
}
