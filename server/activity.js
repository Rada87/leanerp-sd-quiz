import { db } from "./db.js";

const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const PLAYER_ALIAS_PATTERN = /^Player_[A-Z0-9]{6}$/;
const MAX_EXPORT_ROWS = 50000;
const RATE_WINDOW_MS = 60000;
const MAX_EVENTS_PER_SESSION_WINDOW = 120;
const MAX_EVENTS_GLOBAL_WINDOW = 2000;
let rateWindowStartedAt = Date.now();
let globalEventCount = 0;
const sessionEventCounts = new Map();

const METADATA_SCHEMA = {
  app_opened: { online: "boolean", visibility: "string" },
  connectivity_changed: { online: "boolean" },
  screen_viewed: { previousScreen: "string" },
  settings_opened: { screen: "string" },
  questions_loaded: { source: "string", count: "number" },
  questions_load_failed: { message: "longString" },
  queue_state_changed: { state: "string", position: "number", waitingCount: "number" },
  queue_request_failed: { operation: "string", status: "number", message: "longString" },
  queue_left: { previousState: "string" },
  quiz_start_requested: { hasName: "boolean" },
  quiz_started: { questionCount: "number", queueMode: "string" },
  question_viewed: {
    questionId: "string",
    category: "string",
    questionIndex: "number",
    totalQuestions: "number",
  },
  question_answered: {
    questionId: "string",
    category: "string",
    questionIndex: "number",
    isCorrect: "boolean",
    pointsEarned: "number",
    timeSpentSeconds: "number",
    selectedOptionId: "string",
    selectedOptionLabel: "string",
  },
  question_timed_out: {
    questionId: "string",
    category: "string",
    questionIndex: "number",
    timeSpentSeconds: "number",
  },
  quiz_completed: {
    score: "number",
    maxScore: "number",
    percentage: "number",
    correctAnswers: "number",
    totalQuestions: "number",
    durationMs: "number",
  },
  quiz_abandoned: {
    questionIndex: "number",
    answeredCount: "number",
    durationMs: "number",
    reason: "string",
  },
  leaderboard_viewed: {},
  activity_report_viewed: {},
  activity_exported: { count: "number" },
  idle_reset: { screen: "string" },
  score_storage_fallback: { operation: "string", message: "longString" },
  presentation_sync_failed: { status: "number", message: "longString" },
  client_error: {
    kind: "string",
    message: "longString",
    sourceFile: "longString",
    line: "number",
    column: "number",
  },
};

const insertEvent = db.prepare(`
  INSERT INTO activity_events (
    id, event_name, session_id, quiz_run_id, player_alias, app_version, screen,
    occurred_at, received_at, source, metadata_json
  ) VALUES (
    @id, @eventName, @sessionId, @quizRunId, @playerAlias, @appVersion, @screen,
    @occurredAt, @receivedAt, @source, @metadataJson
  )
`);

function cleanString(value, maxLength = 120) {
  if (typeof value !== "string") return undefined;
  const valueTrimmed = value.trim();
  return valueTrimmed ? valueTrimmed.slice(0, maxLength) : undefined;
}

function cleanNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(-1_000_000_000, Math.min(1_000_000_000, value))
    : undefined;
}

function playerAliasForQuizRun(quizRunId) {
  if (!quizRunId) return null;
  const aliasSuffix = quizRunId.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase();
  return `Player_${aliasSuffix.padStart(6, "0")}`;
}

function sanitizeMetadata(eventName, metadata) {
  const schema = METADATA_SCHEMA[eventName];
  if (!schema) throw new Error("unknown event name");
  if (metadata === undefined) return {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("metadata must be an object");
  }

  const clean = {};
  for (const [key, kind] of Object.entries(schema)) {
    const value = metadata[key];
    if (kind === "boolean" && typeof value === "boolean") clean[key] = value;
    else if (kind === "number") {
      const number = cleanNumber(value);
      if (number !== undefined) clean[key] = number;
    } else if (kind === "string") {
      const string = cleanString(value);
      if (string !== undefined) clean[key] = string;
    } else if (kind === "longString") {
      const string = cleanString(value, 500);
      if (string !== undefined) clean[key] = string;
    }
  }
  return clean;
}

function validDate(value) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function enforceRateLimit(sessionId) {
  const currentTime = Date.now();
  if (currentTime - rateWindowStartedAt >= RATE_WINDOW_MS) {
    rateWindowStartedAt = currentTime;
    globalEventCount = 0;
    sessionEventCounts.clear();
  }
  const sessionCount = sessionEventCounts.get(sessionId) || 0;
  if (globalEventCount >= MAX_EVENTS_GLOBAL_WINDOW || sessionCount >= MAX_EVENTS_PER_SESSION_WINDOW) {
    const error = new Error("activity rate limit exceeded");
    error.code = "ACTIVITY_RATE_LIMIT";
    throw error;
  }
  globalEventCount += 1;
  sessionEventCounts.set(sessionId, sessionCount + 1);
}

export function recordActivity(body, source = "client") {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("activity payload must be an object");
  }

  const id = cleanString(body.id, 80);
  const eventName = cleanString(body.eventName, 80);
  const sessionId = cleanString(body.sessionId, 80);
  const quizRunId = body.quizRunId == null ? null : cleanString(body.quizRunId, 80);
  let playerAlias = body.playerAlias == null ? null : cleanString(body.playerAlias, 20);
  const appVersion = cleanString(body.appVersion, 30);
  const screen = body.screen == null ? null : cleanString(body.screen, 40);
  const occurredAt = validDate(body.occurredAt);

  if (!id || !ID_PATTERN.test(id)) throw new Error("invalid event id");
  if (!eventName || !METADATA_SCHEMA[eventName]) throw new Error("unknown event name");
  if (!sessionId || !ID_PATTERN.test(sessionId)) throw new Error("invalid session id");
  if (quizRunId && !ID_PATTERN.test(quizRunId)) throw new Error("invalid quiz run id");
  if (playerAlias && !PLAYER_ALIAS_PATTERN.test(playerAlias)) throw new Error("invalid player alias");
  if (quizRunId && !playerAlias) {
    playerAlias = playerAliasForQuizRun(quizRunId);
  }
  if (!appVersion) throw new Error("app version required");
  if (!occurredAt) throw new Error("valid occurredAt required");

  enforceRateLimit(sessionId);
  const receivedAt = new Date().toISOString();
  const safeOccurredAt = Math.abs(Date.parse(occurredAt) - Date.parse(receivedAt)) <= 86400000
    ? occurredAt
    : receivedAt;
  const metadata = sanitizeMetadata(eventName, body.metadata);

  insertEvent.run({
    id,
    eventName,
    sessionId,
    quizRunId,
    playerAlias,
    appVersion,
    screen,
    occurredAt: safeOccurredAt,
    receivedAt,
    source,
    metadataJson: JSON.stringify(metadata),
  });
}

function eventWindow() {
  const startAt = validDate(process.env.EVENT_START_AT) || null;
  const endAt = validDate(process.env.EVENT_END_AT) || null;
  return {
    startAt,
    endAt: startAt && endAt && Date.parse(endAt) > Date.parse(startAt) ? endAt : null,
  };
}

function phaseFor(receivedAt, window) {
  if (!window.startAt || !window.endAt) return "unconfigured";
  if (receivedAt < window.startAt) return "before";
  if (receivedAt >= window.endAt) return "after";
  return "during";
}

function parseRange(query) {
  const from = validDate(query?.from);
  const to = validDate(query?.to);
  return { from, to };
}

function rangeWhere(range) {
  const clauses = [];
  const params = {};
  if (range.from) {
    clauses.push("received_at >= @from");
    params.from = range.from;
  }
  if (range.to) {
    clauses.push("received_at < @to");
    params.to = range.to;
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

function rowToEvent(row, window) {
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata_json);
  } catch {
    // A malformed legacy row should not break the entire report.
  }
  return {
    id: row.id,
    eventName: row.event_name,
    sessionId: row.session_id,
    quizRunId: row.quiz_run_id,
    playerAlias: row.player_alias || playerAliasForQuizRun(row.quiz_run_id),
    appVersion: row.app_version,
    screen: row.screen,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    phase: phaseFor(row.received_at, window),
    source: row.source,
    metadata,
  };
}

function newStats(label) {
  return {
    label,
    sessionIds: new Set(),
    startedRuns: new Set(),
    completedRuns: new Set(),
    waitingSessions: new Set(),
    answers: 0,
    correctAnswers: 0,
    scoreSum: 0,
    durationSum: 0,
    durationCount: 0,
    errors: 0,
  };
}

function addToStats(stats, event) {
  stats.sessionIds.add(event.sessionId);
  if (event.eventName === "quiz_started") stats.startedRuns.add(event.quizRunId || event.id);
  if (event.eventName === "quiz_completed") {
    stats.completedRuns.add(event.quizRunId || event.id);
    stats.scoreSum += event.metadata.percentage || 0;
    if (typeof event.metadata.durationMs === "number") {
      stats.durationSum += event.metadata.durationMs;
      stats.durationCount += 1;
    }
  }
  if (event.eventName === "queue_state_changed" && event.metadata.state === "waiting") {
    stats.waitingSessions.add(event.sessionId);
  }
  if (event.eventName === "question_answered" || event.eventName === "question_timed_out") {
    stats.answers += 1;
    if (event.metadata.isCorrect === true) stats.correctAnswers += 1;
  }
  if (
    event.eventName === "client_error" || event.eventName.endsWith("_failed") ||
    event.eventName === "score_storage_fallback"
  ) {
    stats.errors += 1;
  }
}

function serializeStats(stats) {
  const starts = stats.startedRuns.size;
  const completions = stats.completedRuns.size;
  return {
    phase: stats.label,
    sessions: stats.sessionIds.size,
    quizStarts: starts,
    quizCompletions: completions,
    completionRate: starts ? Math.round((completions / starts) * 1000) / 10 : 0,
    queuedSessions: stats.waitingSessions.size,
    answers: stats.answers,
    correctAnswerRate: stats.answers
      ? Math.round((stats.correctAnswers / stats.answers) * 1000) / 10
      : 0,
    averageScorePercent: completions ? Math.round((stats.scoreSum / completions) * 10) / 10 : 0,
    averageDurationSeconds: stats.durationCount
      ? Math.round(stats.durationSum / stats.durationCount / 100) / 10
      : 0,
    errors: stats.errors,
  };
}

export function activitySummary(query = {}) {
  const range = parseRange(query);
  const where = rangeWhere(range);
  const rows = db.prepare(`
    SELECT * FROM activity_events ${where.sql} ORDER BY received_at ASC
  `).all(where.params);
  const window = eventWindow();
  const events = rows.map((row) => rowToEvent(row, window));
  const totals = newStats("all");
  const phases = new Map();
  const questions = new Map();
  const players = new Map();

  for (const event of events) {
    addToStats(totals, event);
    if (!phases.has(event.phase)) phases.set(event.phase, newStats(event.phase));
    addToStats(phases.get(event.phase), event);

    if (event.quizRunId) {
      const player = players.get(event.quizRunId) || {
        quizRunId: event.quizRunId,
        playerAlias: event.playerAlias || "Player_UNKNOWN",
        startedAt: null,
        finishedAt: null,
        status: "started",
        scorePercent: null,
        answeredCount: 0,
        durationSeconds: null,
      };
      if (event.eventName === "quiz_started") player.startedAt = event.receivedAt;
      if (event.eventName === "question_answered" || event.eventName === "question_timed_out") {
        player.answeredCount += 1;
      }
      if (event.eventName === "quiz_completed") {
        player.finishedAt = event.receivedAt;
        player.status = "completed";
        player.scorePercent = event.metadata.percentage ?? null;
        player.durationSeconds = typeof event.metadata.durationMs === "number"
          ? Math.round(event.metadata.durationMs / 100) / 10
          : null;
      } else if (event.eventName === "quiz_abandoned" && player.status !== "completed") {
        player.finishedAt = event.receivedAt;
        player.status = "abandoned";
        player.durationSeconds = typeof event.metadata.durationMs === "number"
          ? Math.round(event.metadata.durationMs / 100) / 10
          : null;
      }
      players.set(event.quizRunId, player);
    }

    if (event.eventName === "question_answered" || event.eventName === "question_timed_out") {
      const questionId = event.metadata.questionId || "unknown";
      const current = questions.get(questionId) || {
        questionId,
        category: event.metadata.category || "",
        answers: 0,
        correct: 0,
        timeSum: 0,
        choices: new Map(),
      };
      current.answers += 1;
      if (event.metadata.isCorrect === true) current.correct += 1;
      current.timeSum += event.metadata.timeSpentSeconds || 0;
      const optionId = event.eventName === "question_timed_out"
        ? "timeout"
        : event.metadata.selectedOptionId || "unknown";
      const optionLabel = event.eventName === "question_timed_out"
        ? "Timeout"
        : event.metadata.selectedOptionLabel || optionId;
      const choice = current.choices.get(optionId) || { optionId, optionLabel, count: 0 };
      choice.count += 1;
      current.choices.set(optionId, choice);
      questions.set(questionId, current);
    }
  }

  const phaseOrder = ["before", "during", "after", "unconfigured"];
  const questionStats = [...questions.values()].map((question) => ({
    questionId: question.questionId,
    category: question.category,
    answers: question.answers,
    correctRate: question.answers ? Math.round((question.correct / question.answers) * 1000) / 10 : 0,
    averageResponseSeconds: question.answers
      ? Math.round((question.timeSum / question.answers) * 10) / 10
      : 0,
    choices: [...question.choices.values()].map((choice) => ({
      ...choice,
      percentage: question.answers ? Math.round((choice.count / question.answers) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count || a.optionLabel.localeCompare(b.optionLabel)),
  })).sort((a, b) => b.answers - a.answers || a.questionId.localeCompare(b.questionId));

  const playerStats = [...players.values()].sort((a, b) => {
    const aTime = a.finishedAt || a.startedAt || "";
    const bTime = b.finishedAt || b.startedAt || "";
    return bTime.localeCompare(aTime);
  });

  const recentErrors = events.filter((event) => (
    event.eventName === "client_error" || event.eventName.endsWith("_failed") ||
    event.eventName === "score_storage_fallback"
  )).slice(-20).reverse();

  return {
    generatedAt: new Date().toISOString(),
    retentionDays: Math.min(
      Math.max(Number.parseInt(process.env.ACTIVITY_RETENTION_DAYS || "180", 10) || 180, 1),
      3650
    ),
    eventWindow: window,
    range,
    totals: serializeStats(totals),
    phases: phaseOrder.filter((phase) => phases.has(phase)).map((phase) => serializeStats(phases.get(phase))),
    players: playerStats,
    questions: questionStats,
    recentErrors,
  };
}

export function exportActivity(query = {}) {
  const range = parseRange(query);
  const where = rangeWhere(range);
  const requestedLimit = Number.parseInt(query?.limit, 10);
  const limit = Math.min(Math.max(requestedLimit || 10000, 1), MAX_EXPORT_ROWS);
  const rows = db.prepare(`
    SELECT * FROM activity_events ${where.sql} ORDER BY received_at ASC LIMIT @limit
  `).all({ ...where.params, limit });
  const window = eventWindow();
  return {
    generatedAt: new Date().toISOString(),
    eventWindow: window,
    range,
    count: rows.length,
    limit,
    events: rows.map((row) => rowToEvent(row, window)),
  };
}
