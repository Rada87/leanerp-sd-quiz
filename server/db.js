import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "quiz.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage REAL NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_option_id TEXT NOT NULL,
    explanation TEXT NOT NULL
  );
`);

function seedQuestionsIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM questions").get();
  if (count > 0) return;

  const seedPath = path.join(__dirname, "..", "dist", "questions.json");
  if (!fs.existsSync(seedPath)) return;

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const insert = db.prepare(`
    INSERT INTO questions (id, category, question, options, correct_option_id, explanation)
    VALUES (@id, @category, @question, @options, @correct_option_id, @explanation)
  `);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(
    seed.map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      options: JSON.stringify(q.options),
      correct_option_id: q.correctOptionId,
      explanation: q.explanation,
    }))
  );
}

seedQuestionsIfEmpty();
