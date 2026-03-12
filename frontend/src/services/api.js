const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const SESSION_STORAGE_KEY = "englishbuddy-session";

function getErrorMessage(path, payload) {
  if (payload?.code === "AI_NOT_CONFIGURED" && path.startsWith("/ai/")) {
    return "Live AI is not enabled on this site yet. Add the OpenAI API key in Render to turn it on.";
  }

  return payload?.message || "Request failed.";
}

export function loadSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers || {});
  const session = loadSession();

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (session?.token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(getErrorMessage(path, payload));
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }

  return payload;
}

export function registerUser(formData) {
  return request("/auth/register", {
    method: "POST",
    body: formData,
  });
}

export function loginUser(formData) {
  return request("/auth/login", {
    method: "POST",
    body: formData,
  });
}

export function logoutUser() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export function fetchDashboard() {
  return request("/me/dashboard");
}

export function fetchSessions() {
  return request("/me/sessions");
}

export function fetchHealth() {
  return request("/health");
}

export function createSession(formData) {
  return request("/me/sessions", {
    method: "POST",
    body: formData,
  });
}

export function requestPracticeTurn(formData) {
  return request("/ai/practice-turn", {
    method: "POST",
    body: formData,
  });
}

export function requestPracticeSummary(formData) {
  return request("/ai/practice-summary", {
    method: "POST",
    body: formData,
  });
}
