import { createClient } from "@supabase/supabase-js";
import { LEADERBOARD_TOP_N } from "../constants";
import type { ScoreRecord } from "../types";
import type { ScoreStorage } from "./ScoreStorage";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

function toRow(r: ScoreRecord) {
  return {
    id: r.id,
    player_name: r.playerName,
    score: r.score,
    max_score: r.maxScore,
    percentage: r.percentage,
    correct_answers: r.correctAnswers,
    total_questions: r.totalQuestions,
    created_at: r.createdAt,
  };
}

function fromRow(row: Record<string, unknown>): ScoreRecord {
  return {
    id: row.id as string,
    playerName: row.player_name as string,
    score: row.score as number,
    maxScore: row.max_score as number,
    percentage: row.percentage as number,
    correctAnswers: row.correct_answers as number,
    totalQuestions: row.total_questions as number,
    createdAt: row.created_at as string,
  };
}

export class SupabaseScoreStorage implements ScoreStorage {
  async saveScore(record: ScoreRecord): Promise<void> {
    const { error } = await supabase.from("leaderboard").insert(toRow(record));
    if (error) throw new Error(error.message);
  }

  async getScores(): Promise<ScoreRecord[]> {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("score", { ascending: false })
      .limit(LEADERBOARD_TOP_N);
    if (error) throw new Error(error.message);
    return (data ?? []).map(fromRow);
  }

  async clearScores(): Promise<void> {
    const { error } = await supabase
      .from("leaderboard")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
  }

  async exportScores(): Promise<ScoreRecord[]> {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("score", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(fromRow);
  }

  async importScores(records: ScoreRecord[]): Promise<void> {
    if (!records.length) return;
    const { error } = await supabase
      .from("leaderboard")
      .upsert(records.map(toRow), { onConflict: "id" });
    if (error) throw new Error(error.message);
  }
}
