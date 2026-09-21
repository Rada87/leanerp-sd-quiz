import crypto from "node:crypto";

// No fallback on purpose: a default baked into the repository would be a
// published password, and every deployment that never edited .env would share
// it. Without ADMIN_PASSWORD the admin routes simply stay shut — the quiz
// itself keeps running, which is the safe direction to fail during an event.
const PASSWORD = process.env.ADMIN_PASSWORD || "";
const CONFIGURED = PASSWORD.length > 0;

if (!CONFIGURED) {
  console.warn(
    "[admin] ADMIN_PASSWORD is not set — maintenance actions are disabled. " +
      "Set it in .env to enable the admin panel."
  );
}
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 2 * 60 * 1000;
const MAX_TRACKED_IPS = 5000;
// Generous enough that a mistyped password during the event never locks the
// admin out for long, tight enough to make guessing pointless.
const MAX_ATTEMPTS = 20;

// Tokens live only in memory: one Express process is authoritative and a
// restart logging everyone out is the safe direction to fail.
const sessions = new Map(); // token -> expiresAt (ms)
const attempts = new Map(); // ip -> { count, resetAt }

function now() {
  return Date.now();
}

function pruneAttempts() {
  const t = now();
  for (const [ip, entry] of attempts) {
    if (entry.resetAt <= t) attempts.delete(ip);
  }
}

function pruneSessions() {
  const t = now();
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= t) sessions.delete(token);
  }
}

function matchesPassword(candidate) {
  if (typeof candidate !== "string") return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(PASSWORD);
  // timingSafeEqual throws on a length mismatch, so compare a fixed-size digest.
  return crypto.timingSafeEqual(
    crypto.createHash("sha256").update(a).digest(),
    crypto.createHash("sha256").update(b).digest()
  );
}

function throttled(ip) {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now()) {
    // One failed attempt per address would otherwise be remembered forever;
    // sweep the expired ones before the map can grow without bound.
    if (attempts.size >= MAX_TRACKED_IPS) pruneAttempts();
    attempts.set(ip, { count: 1, resetAt: now() + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

// A server that stops seeing login attempts should not keep the last ones
// in memory either. unref() keeps this timer from holding the process open.
setInterval(() => {
  pruneAttempts();
  pruneSessions();
}, ATTEMPT_WINDOW_MS).unref();

export function openSession(password, ip) {
  if (!CONFIGURED) return { error: "not_configured" };
  if (throttled(ip)) return { error: "too_many_attempts" };
  if (!matchesPassword(password)) {
    recordFailure(ip);
    return { error: "invalid_password" };
  }
  attempts.delete(ip);
  pruneSessions();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = now() + SESSION_TTL_MS;
  sessions.set(token, expiresAt);
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

export function closeSession(token) {
  if (typeof token === "string") sessions.delete(token);
}

export function isValidToken(token) {
  if (typeof token !== "string" || token.length === 0) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function tokenOf(req) {
  return req.get("x-admin-token") || (typeof req.query?.adminToken === "string" ? req.query.adminToken : "");
}

// Guards every destructive or data-revealing route. The quiz itself never
// passes through here — an admin lockout must not stop anyone from playing.
export function requireAdmin(req, res, next) {
  if (!CONFIGURED) {
    return res.status(503).json({ error: "admin password is not configured on the server" });
  }
  if (isValidToken(tokenOf(req))) return next();
  res.status(401).json({ error: "admin authentication required" });
}
