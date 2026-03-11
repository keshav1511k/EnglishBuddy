import { Link } from "react-router-dom";

export default function Home({ session }) {
  return (
    <main className="page-shell home-shell">
      <section className="hero-panel home-hero">
        <span className="eyebrow">Live AI speaking practice</span>
        <h1>Practice real English conversations and get coaching immediately.</h1>
        <p>
          EnglishBuddy gives you a live AI conversation partner, instant transcript-based
          feedback, and a simple way to save each practice session to your dashboard.
        </p>

        <div className="hero-actions">
          {session ? (
            <>
              <Link className="primary-button" to="/practice">
                Start AI practice
              </Link>
              <Link className="ghost-link" to="/dashboard">
                View dashboard
              </Link>
            </>
          ) : (
            <>
              <Link className="primary-button" to="/login">
                Log in
              </Link>
              <Link className="ghost-link" to="/register">
                Create account
              </Link>
            </>
          )}
        </div>

        <div className="hero-points home-points">
          <div>
            <strong>Talk naturally</strong>
            <span>Use your microphone or type when you need a fallback.</span>
          </div>
          <div>
            <strong>Get feedback each turn</strong>
            <span>See grammar, vocabulary, and confidence coaching immediately.</span>
          </div>
          <div>
            <strong>Save the session</strong>
            <span>Push your AI practice notes into your dashboard history.</span>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article className="panel feature-panel">
          <span className="eyebrow">Use cases</span>
          <h2>Interview prep, fluency drills, and everyday conversation.</h2>
          <p>
            Pick a topic, let the AI coach ask follow-up questions, and review what to
            improve next.
          </p>
        </article>

        <article className="panel feature-panel">
          <span className="eyebrow">Navigation</span>
          <h2>The logo now always returns to home.</h2>
          <p>
            Your public home page, login routes, live AI practice, and dashboard are now
            separated cleanly.
          </p>
        </article>
      </section>
    </main>
  );
}
