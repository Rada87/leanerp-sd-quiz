import { Router } from "express";
import { db } from "./db.js";

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

// --- Scores ---

router.get("/scores", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM scores ORDER BY score DESC LIMIT ?")
    .all(LEADERBOARD_TOP_N);
  res.json(rows.map(scoreFromRow));
});

router.get("/scores/export", (_req, res) => {
  const rows = db.prepare("SELECT * FROM scores ORDER BY score DESC").all();
  res.json(rows.map(scoreFromRow));
});

router.post("/scores", (req, res) => {
  const r = req.body;
  db.prepare(`
    INSERT INTO scores (id, player_name, score, max_score, percentage, correct_answers, total_questions, created_at)
    VALUES (@id, @playerName, @score, @maxScore, @percentage, @correctAnswers, @totalQuestions, @createdAt)
  `).run(r);
  res.status(201).json({ ok: true });
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
