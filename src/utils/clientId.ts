const KEY = "leanerp-quiz-client-id";

/**
 * Stable per-tablet identity for the play queue. Persisted so a reload
 * mid-quiz keeps the player's slot instead of sending them to the back.
 */
export function getClientId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled — a per-session id still gates fine.
    return crypto.randomUUID();
  }
}
