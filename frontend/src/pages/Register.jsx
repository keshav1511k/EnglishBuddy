import { useState } from "react";
import { Link } from "react-router-dom";
import { registerUser } from "../services/api";

const levels = ["Beginner", "Intermediate", "Advanced"];

export default function Register({ onRegister }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    level: "Intermediate",
    weeklyGoalMinutes: 90,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "weeklyGoalMinutes" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await registerUser(form);
      onRegister(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page-shell auth-shell">
      <section className="hero-panel">
        <span className="eyebrow">Start your practice system</span>
        <h1>Create a speaking routine you can actually keep.</h1>
        <p>
          Set a weekly target, log every session, and build proof that your fluency
          is improving over time.
        </p>
        <div className="goal-grid">
          <article>
            <strong>Beginner</strong>
            <span>Short daily speaking blocks with familiar topics.</span>
          </article>
          <article>
            <strong>Intermediate</strong>
            <span>Confidence building through repeated real-world prompts.</span>
          </article>
          <article>
            <strong>Advanced</strong>
            <span>Sharper delivery, vocabulary range, and interview readiness.</span>
          </article>
        </div>
      </section>

      <section className="auth-card">
        <div className="section-heading">
          <span className="eyebrow">New account</span>
          <h2>Register for EnglishBuddy</h2>
        </div>

        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </label>

          <label className="field">
            <span>Current level</span>
            <select name="level" value={form.level} onChange={handleChange}>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Weekly speaking goal (minutes)</span>
            <input
              name="weeklyGoalMinutes"
              type="number"
              min="30"
              step="15"
              value={form.weeklyGoalMinutes}
              onChange={handleChange}
              required
            />
          </label>

          {error ? <p className="form-message error-message">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
