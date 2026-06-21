const CURRENT_SESSION_KEY = "aura-current-session-id";

/**
 * Creates a brand new chat thread id. Each "New Chat" gets one of these;
 * it isn't persisted to MongoDB until the first message is sent.
 */
export function createSessionId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Remembers which chat thread was open last, so a page refresh resumes it. */
export function getStoredSessionId() {
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

export function setStoredSessionId(id) {
  localStorage.setItem(CURRENT_SESSION_KEY, id);
}
