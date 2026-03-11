import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Navbar from "./components/Navbar";
import {
  clearSession,
  loadSession,
  logoutUser,
  saveSession,
} from "./services/api";
import "./App.css";

function GuestRoute({ session, children }) {
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());

  const handleAuthenticated = (nextSession) => {
    saveSession(nextSession);
    setSession(nextSession);
  };

  const handleLogout = async () => {
    try {
      if (session?.token) {
        await logoutUser();
      }
    } catch {
      // Local session still needs to be cleared even if the backend is unavailable.
    } finally {
      clearSession();
      setSession(null);
    }
  };

  return (
    <BrowserRouter>
      <Navbar session={session} onLogout={handleLogout} />
      <Routes>
        <Route
          path="/"
          element={
            <GuestRoute session={session}>
              <Login onLogin={handleAuthenticated} />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute session={session}>
              <Register onRegister={handleAuthenticated} />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={session ? "/dashboard" : "/"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
