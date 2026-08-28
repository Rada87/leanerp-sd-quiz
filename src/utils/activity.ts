import { APP_VERSION } from "../constants";
import type { AppScreen } from "../types";

export type ActivityEventName =
  | "app_opened"
  | "connectivity_changed"
  | "screen_viewed"
  | "settings_opened"
  | "questions_loaded"
  | "questions_load_failed"
  | "queue_state_changed"
  | "queue_request_failed"
  | "queue_left"
  | "quiz_start_requested"
  | "quiz_started"
  | "question_viewed"
  | "question_answered"
  | "question_timed_out"
  | "quiz_completed"
  | "quiz_abandoned"
  | "leaderboard_viewed"
  | "activity_report_viewed"
  | "activity_exported"
  | "idle_reset"
  | "score_storage_fallback"
  | "presentation_sync_failed"
  | "client_error";

type ActivityMetadata = Record<string, string | number | boolean | null | undefined>;

const activityUrl = `${import.meta.env.BASE_URL}api/activity`;

function randomId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const parts = globalThis.crypto.getRandomValues(new Uint32Array(4));
    return Array.from(parts, (part) => part.toString(16).padStart(8, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

const sessionId = randomId();
let quizRunId: string | null = null;
let playerAlias: string | null = null;
let currentScreen: AppScreen = "start";
let initialized = false;

function payloadFor(eventName: ActivityEventName, metadata: ActivityMetadata) {
  return {
    id: randomId(),
    eventName,
    sessionId,
    quizRunId,
    playerAlias,
    appVersion: APP_VERSION,
    screen: currentScreen,
    occurredAt: new Date().toISOString(),
    metadata,
  };
}

export function getActivitySessionId(): string {
  return sessionId;
}

export function beginQuizActivity(): string {
  quizRunId = randomId();
  const aliasSuffix = randomId().replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase();
  playerAlias = `Player_${aliasSuffix.padEnd(6, "0")}`;
  return quizRunId;
}

export function getQuizActivityId(): string | null {
  return quizRunId;
}

export function setActivityScreen(screen: AppScreen): void {
  currentScreen = screen;
}

export function logActivity(
  eventName: ActivityEventName,
  metadata: ActivityMetadata = {},
  options: { beacon?: boolean } = {}
): void {
  const payload = payloadFor(eventName, metadata);
  const body = JSON.stringify(payload);

  if (options.beacon && navigator.sendBeacon) {
    const accepted = navigator.sendBeacon(
      activityUrl,
      new Blob([body], { type: "application/json" })
    );
    if (accepted) return;
  }

  try {
    fetch(activityUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch((error) => {
      console.warn("[quiz-activity] delivery failed.", error);
    });
  } catch (error) {
    console.warn("[quiz-activity] could not create activity request.", error);
  }
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  return "Unknown client error";
}

export function initializeActivityLogging(): void {
  if (initialized) return;
  initialized = true;

  logActivity("app_opened", {
    online: navigator.onLine,
    visibility: document.visibilityState,
  });

  window.addEventListener("online", () => {
    logActivity("connectivity_changed", { online: true });
  });
  window.addEventListener("offline", () => {
    logActivity("connectivity_changed", { online: false });
  });
  window.addEventListener("error", (event) => {
    logActivity("client_error", {
      kind: "error",
      message: errorMessage(event.error || event.message),
      sourceFile: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    logActivity("client_error", {
      kind: "unhandledrejection",
      message: errorMessage(event.reason),
    });
  });
}
