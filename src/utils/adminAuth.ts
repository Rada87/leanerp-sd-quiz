import { useSyncExternalStore } from "react";

const apiBase = `${import.meta.env.BASE_URL}api`;

// Kept in memory only, exactly like the queue client id: a tablet left on the
// stand must not stay unlocked for the next person who picks it up, and a
// reload is the fastest way back to a locked kiosk.
let token: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export class AdminAuthError extends Error {
  constructor(message = "Admin authentication required") {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function isAdminUnlocked(): boolean {
  return token !== null;
}

export function adminHeaders(): Record<string, string> {
  return token ? { "x-admin-token": token } : {};
}

export type UnlockResult = "ok" | "invalid" | "throttled" | "unavailable";

export async function unlockAdmin(password: string): Promise<UnlockResult> {
  try {
    const res = await fetch(`${apiBase}/admin/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.status === 401) return "invalid";
    if (res.status === 429) return "throttled";
    if (!res.ok) return "unavailable";
    const data = await res.json();
    if (typeof data?.token !== "string") return "unavailable";
    token = data.token;
    notify();
    return "ok";
  } catch {
    return "unavailable";
  }
}

export function lockAdmin(): void {
  const previous = token;
  token = null;
  notify();
  if (previous) {
    fetch(`${apiBase}/admin/session`, {
      method: "DELETE",
      headers: { "x-admin-token": previous },
    }).catch(() => {});
  }
}

// The server rejected the token — drop it so the UI locks itself again
// instead of offering actions that will keep failing.
export function handleAdminRejection(): void {
  if (token !== null) {
    token = null;
    notify();
  }
}

export function useAdminUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isAdminUnlocked, () => false);
}
