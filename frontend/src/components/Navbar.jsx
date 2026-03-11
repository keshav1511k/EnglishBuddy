import { Link, useLocation } from "react-router-dom";

export default function Navbar({ session, onLogout }) {
  const location = useLocation();

  const isActive = (path) => (location.pathname === path ? "is-active" : "");

  return (
    <header className="site-header">
      <div className="brand-lockup">
        <Link className="brand-mark" to={session ? "/dashboard" : "/"}>
          EnglishBuddy
        </Link>
        <p className="brand-tagline">Practice speaking with structure, not guesswork.</p>
      </div>

      <nav className="site-nav">
        {session ? (
          <>
            <span className="user-chip">
              {session.user.name}
              <small>{session.user.level}</small>
            </span>
            <button className="ghost-button" type="button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className={`nav-link ${isActive("/")}`} to="/">
              Log in
            </Link>
            <Link className={`nav-link ${isActive("/register")}`} to="/register">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
