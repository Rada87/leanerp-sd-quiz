/**
 * Play-time limit for a visitor's own phone or laptop.
 *
 * The stand has a handful of tablets; the quiz URL, once shared, also runs on
 * every visitor's device, from anywhere. Since one global queue lets a single
 * player hold the stand's play slot, someone replaying from their office all
 * afternoon is not just noise — it takes the slot away from the people
 * standing at the booth. A visitor's device may therefore play for
 * VISIT_TIME_LIMIT_MS, counted from their first start, and is then shown a
 * thank-you screen.
 *
 * This is a speed bump, not a lock. Clearing site data or opening a private
 * window resets it, which is fine: it stops idle replaying, not a determined
 * person, and nothing here is worth defending harder than that.
 *
 * Unlike the queue identity in clientId.ts, this state MUST survive a reload —
 * a limit that a refresh clears would stop nobody. It is per-browser-profile
 * by nature, which is the closest thing to "device" a web page can see.
 *
 * The tablets at the stand are exempt: open them once with ?kiosk=1 and the
 * flag sticks in that browser profile. That is also why the limit fails open —
 * if storage is unavailable (private mode, blocked site data) the quiz stays
 * playable rather than locking someone out by accident.
 */
import { VISIT_TIME_LIMIT_MS } from "../constants";

const KIOSK_KEY = "leanerp-quiz-kiosk";
const CLOCK_KEY = "leanerp-quiz-visit-started-at";

function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the limit simply does not apply.
  }
}

function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // As above.
  }
}

/**
 * Reads ?kiosk=1 (or ?kiosk=0 to undo it) once per page load and remembers the
 * answer, so the stand's tablets are marked by opening one URL and keep the
 * mark across restarts.
 */
export function initVisitSession(): void {
  let param: string | null;
  try {
    param = new URLSearchParams(window.location.search).get("kiosk");
  } catch {
    return;
  }
  if (param === null) return;

  if (param === "0" || param === "false") {
    removeItem(KIOSK_KEY);
  } else {
    writeItem(KIOSK_KEY, "1");
    // A tablet switched into kiosk mode should not carry a clock it started
    // earlier while it was still treated as a visitor's device.
    removeItem(CLOCK_KEY);
  }
}

export function isKioskDevice(): boolean {
  return readItem(KIOSK_KEY) === "1";
}

/** Starts the clock on the first quiz launch; later launches do not extend it. */
export function startVisitClock(): void {
  if (isKioskDevice()) return;
  if (readItem(CLOCK_KEY) !== null) return;
  writeItem(CLOCK_KEY, String(Date.now()));
}

function startedAt(): number | null {
  const raw = readItem(CLOCK_KEY);
  if (raw === null) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

export function isVisitBlocked(): boolean {
  if (isKioskDevice()) return false;
  const started = startedAt();
  if (started === null) return false;
  // A clock stamped in the future means the device clock moved backwards;
  // treat it as just started rather than blocking for days.
  if (started > Date.now()) return false;
  return Date.now() - started >= VISIT_TIME_LIMIT_MS;
}

/** Remaining play time in ms, or null when no limit applies. */
export function visitTimeRemaining(): number | null {
  if (isKioskDevice()) return null;
  const started = startedAt();
  if (started === null) return null;
  return Math.max(0, started + VISIT_TIME_LIMIT_MS - Date.now());
}

/** Lifts the block on this device. Used by the admin panel at the stand. */
export function resetVisitClock(): void {
  removeItem(CLOCK_KEY);
}

/** Marks this browser as a stand tablet, clearing any limit it had picked up. */
export function enableKiosk(): void {
  writeItem(KIOSK_KEY, "1");
  removeItem(CLOCK_KEY);
}

export function disableKiosk(): void {
  removeItem(KIOSK_KEY);
  removeItem(CLOCK_KEY);
}
