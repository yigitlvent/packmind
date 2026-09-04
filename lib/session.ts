const SESSION_KEY = "packmind_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") {
    throw new Error("Session ID is only available in the browser.");
  }

  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }

  document.cookie = `${SESSION_KEY}=${sessionId}; path=/; max-age=31536000; samesite=lax`;
  return sessionId;
}
