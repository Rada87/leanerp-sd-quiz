import { broadcast } from "./events.js";

// Single-player gate for the quiz. Session state only — deliberately in
// memory, never SQLite: it must not survive a restart, and the app runs as
// one Express process so this is the authoritative copy.

// An active player is only nudged out once they've gone quiet for longer
// than a question can legitimately take (questions are capped at 30 s).
const ACTIVE_TIMEOUT_MS = 60000;
// Someone whose turn came up but who never tapped "start" — they've most
// likely walked away, so hand the slot to the next person.
const READY_TIMEOUT_MS = 45000;
// A tablet still in line that stopped sending heartbeats (closed, asleep).
const WAITING_TIMEOUT_MS = 60000;
const SWEEP_INTERVAL_MS = 5000;

let active = null; // { clientId, playerName, lastSeen }
let ready = null; // { clientId, playerName, lastSeen, readyAt }
let waiting = []; // [{ clientId, playerName, lastSeen }]

function now() {
  return Date.now();
}

function snapshot() {
  return {
    active: active ? { clientId: active.clientId, playerName: active.playerName } : null,
    ready: ready ? { clientId: ready.clientId, playerName: ready.playerName } : null,
    waiting: waiting.map((w) => ({ clientId: w.clientId, playerName: w.playerName })),
    waitingCount: waiting.length + (ready ? 1 : 0),
  };
}

function publish() {
  broadcast("queue_state", snapshot());
}

// Move the head of the line into the "your turn" state whenever the table
// is free. Called after every mutation, so promotion can't be forgotten.
function promote() {
  if (active || ready) return;
  const next = waiting.shift();
  if (!next) return;
  ready = { ...next, readyAt: now() };
}

function drop(clientId) {
  if (active?.clientId === clientId) active = null;
  if (ready?.clientId === clientId) ready = null;
  waiting = waiting.filter((w) => w.clientId !== clientId);
}

/** Where does this client stand? position is 1-based among those still queued. */
function stateFor(clientId) {
  if (active?.clientId === clientId) return { state: "active", position: 0 };
  if (ready?.clientId === clientId) return { state: "ready", position: 0 };
  const index = waiting.findIndex((w) => w.clientId === clientId);
  if (index >= 0) return { state: "waiting", position: index + 1 };
  return { state: "idle", position: 0 };
}

function result(clientId) {
  return { ...stateFor(clientId), ...snapshot() };
}

export function join(clientId, playerName) {
  const name = playerName || "Guest";
  drop(clientId);

  if (!active && !ready) {
    active = { clientId, playerName: name, lastSeen: now() };
  } else {
    waiting.push({ clientId, playerName: name, lastSeen: now() });
  }

  promote();
  publish();
  return result(clientId);
}

/** A player whose turn came up tapped "start". */
export function claim(clientId) {
  if (ready?.clientId === clientId && !active) {
    active = { clientId, playerName: ready.playerName, lastSeen: now() };
    ready = null;
    promote();
    publish();
  }
  return result(clientId);
}

export function heartbeat(clientId) {
  const entry =
    (active?.clientId === clientId && active) ||
    (ready?.clientId === clientId && ready) ||
    waiting.find((w) => w.clientId === clientId);
  if (entry) entry.lastSeen = now();
  return result(clientId);
}

export function leave(clientId) {
  const wasKnown = stateFor(clientId).state !== "idle";
  drop(clientId);
  promote();
  if (wasKnown) publish();
  return result(clientId);
}

export function getState(clientId) {
  return result(clientId);
}

function sweep() {
  const t = now();
  let changed = false;

  if (active && t - active.lastSeen > ACTIVE_TIMEOUT_MS) {
    active = null;
    changed = true;
  }
  if (ready && (t - ready.readyAt > READY_TIMEOUT_MS || t - ready.lastSeen > WAITING_TIMEOUT_MS)) {
    ready = null;
    changed = true;
  }
  const before = waiting.length;
  waiting = waiting.filter((w) => t - w.lastSeen <= WAITING_TIMEOUT_MS);
  if (waiting.length !== before) changed = true;

  const hadReady = !!ready;
  promote();
  if (!hadReady && ready) changed = true;

  if (changed) publish();
}

setInterval(sweep, SWEEP_INTERVAL_MS).unref();
