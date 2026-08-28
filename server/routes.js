import { Router } from "express";
import { db } from "./db.js";
import { broadcast, getLatest } from "./events.js";
import * as queue from "./queue.js";
import { activitySummary, exportActivity, recordActivity } from "./activity.js";

const LEADERBOARD_TOP_N = 10;

function scoreFromRow(row) {
  return {
    id: row.id,
    playerName: row.player_name,
    score: row.score,
    maxScore: row.max_score,
    percentage: row.percentage,
    correctAnswers: row.correct_answers,
    totalQuestions: row.total_questions,
    createdAt: row.created_at,
  };
}

function publicLeaderboardEntryFromRow(row) {
  return {
    playerName: row.player_name,
    score: row.score,
    percentage: row.percentage,
    correctAnswers: row.correct_answers,
    totalQuestions: row.total_questions,
    createdAt: row.created_at,
  };
}

function questionFromRow(row) {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    options: JSON.parse(row.options),
    correctOptionId: row.correct_option_id,
    explanation: row.explanation,
  };
}

export const router = Router();

// --- Privacy-first activity logging ---

router.post("/activity", (req, res) => {
  try {
    recordActivity(req.body);
    res.status(204).end();
  } catch (error) {
    if (error?.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      // Delivery may be retried by the browser; event ids make it idempotent.
      return res.status(204).end();
    }
    if (error?.code === "ACTIVITY_RATE_LIMIT") {
      return res.status(429).json({ error: "activity rate limit exceeded" });
    }
    res.status(400).json({ error: error instanceof Error ? error.message : "invalid activity" });
  }
});

router.get("/activity/summary", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(activitySummary(req.query));
});

router.get("/activity/export", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(exportActivity(req.query));
});

// --- Scores ---

router.get("/scores", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM scores ORDER BY score DESC LIMIT ?")
    .all(LEADERBOARD_TOP_N);
  res.json(rows.map(scoreFromRow));
});

// Stable, intentionally limited data contract for public displays such as
// the Škoda Days presentation. It never exposes score IDs or admin data.
router.get("/leaderboard", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM scores ORDER BY score DESC, created_at ASC LIMIT ?")
    .all(LEADERBOARD_TOP_N);
  res.set("Cache-Control", "public, max-age=10");
  res.json({ updatedAt: new Date().toISOString(), entries: rows.map(publicLeaderboardEntryFromRow) });
});

router.get("/scores/export", (_req, res) => {
  const rows = db.prepare("SELECT * FROM scores ORDER BY score DESC").all();
  res.json(rows.map(scoreFromRow));
});

// Same information the event stream carries, as a plain request. A network
// that buffers long-lived responses leaves a presentation stuck on an
// unusable stream, and it can poll this instead.
router.get("/state", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(getLatest());
});

// --- Play queue (one player at a time) ---

function clientIdOf(req) {
  const id = req.body?.clientId ?? req.query?.clientId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function queueHandler(fn) {
  return (req, res) => {
    const clientId = clientIdOf(req);
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    res.json(fn(clientId, req));
  };
}

router.get("/queue", queueHandler((id) => queue.getState(id)));
router.post("/queue/join", queueHandler((id, req) => queue.join(id, req.body?.playerName)));
router.post("/queue/claim", queueHandler((id) => queue.claim(id)));
router.post("/queue/heartbeat", queueHandler((id) => queue.heartbeat(id)));
router.post("/queue/leave", queueHandler((id) => queue.leave(id)));

// Lightweight relay for live quiz-progress mirroring on the presentation
// display. No persistence — just re-broadcast to any connected SSE clients.
router.post("/session", (req, res) => {
  broadcast("quiz_progress", req.body);
  res.status(204).end();
});

router.post("/scores", (req, res) => {
  const r = req.body;
  db.prepare(`
    INSERT INTO scores (id, player_name, score, max_score, percentage, correct_answers, total_questions, created_at)
    VALUES (@id, @playerName, @score, @maxScore, @percentage, @correctAnswers, @totalQuestions, @createdAt)
  `).run(r);

  const { rank } = db
    .prepare(
      "SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > @score OR (score = @score AND created_at < @createdAt)"
    )
    .get(r);
  const { totalPlayers } = db.prepare("SELECT COUNT(*) AS totalPlayers FROM scores").get();

  if (req.body.broadcast !== false) {
    broadcast("quiz_completed", {
      clientId: r.clientId,
      playerName: r.playerName,
      score: r.score,
      maxScore: r.maxScore,
      percentage: r.percentage,
      correctAnswers: r.correctAnswers,
      totalQuestions: r.totalQuestions,
      rank,
      totalPlayers,
    });
  }

  res.status(201).json({ ok: true, rank, totalPlayers });
});

router.post("/scores/import", (req, res) => {
  const records = req.body;
  const upsert = db.prepare(`
    INSERT INTO scores (id, player_name, score, max_score, percentage, correct_answers, total_questions, created_at)
    VALUES (@id, @playerName, @score, @maxScore, @percentage, @correctAnswers, @totalQuestions, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      player_name = excluded.player_name,
      score = excluded.score,
      max_score = excluded.max_score,
      percentage = excluded.percentage,
      correct_answers = excluded.correct_answers,
      total_questions = excluded.total_questions,
      created_at = excluded.created_at
  `);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) upsert.run(row);
  });
  insertMany(records);
  res.json({ ok: true });
});

router.delete("/scores/:id", (req, res) => {
  db.prepare("DELETE FROM scores WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.delete("/scores", (_req, res) => {
  db.prepare("DELETE FROM scores").run();
  res.json({ ok: true });
});

// --- Questions ---

router.get("/questions", (_req, res) => {
  const rows = db.prepare("SELECT * FROM questions ORDER BY id").all();
  res.json(rows.map(questionFromRow));
});

router.post("/questions", (req, res) => {
  const q = req.body;
  db.prepare(`
    INSERT INTO questions (id, category, question, options, correct_option_id, explanation)
    VALUES (@id, @category, @question, @options, @correctOptionId, @explanation)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      question = excluded.question,
      options = excluded.options,
      correct_option_id = excluded.correct_option_id,
      explanation = excluded.explanation
  `).run({ ...q, options: JSON.stringify(q.options) });
  res.status(201).json({ ok: true });
});

router.delete("/questions/:id", (req, res) => {
  db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
