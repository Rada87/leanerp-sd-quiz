const KEY = "leanerp-quiz-client-id";

/**
 * Per-tab identity for the play queue.
 *
 * Deliberately sessionStorage, not localStorage: localStorage is shared by
 * every tab of a browser, so two tabs claimed the same identity and each
 * join handed the slot from one to the other, letting both play at once.
 * sessionStorage is scoped to the tab yet survives a reload, so a player
 * who refreshes mid-quiz still keeps their slot.
 */
export function getClientId(): string {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled — a per-instance id still gates fine.
    return crypto.randomUUID();
  }
}
