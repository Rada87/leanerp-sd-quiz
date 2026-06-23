import { LEADERBOARD_TOP_N, STORAGE_KEY } from "../constants";
import type { ScoreRecord } from "../types";
import type { ScoreStorage } from "./ScoreStorage";

export class LocalStorageScoreStorage implements ScoreStorage {
  async saveScore(record: ScoreRecord): Promise<void> {
    try {
      const scores = await this.getScores();
      scores.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // QuotaExceededError or other write failure — silently drop
    }
  }

  async getScores(): Promise<ScoreRecord[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const scores: ScoreRecord[] = JSON.parse(raw);
      return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_TOP_N);
    } catch {
      return [];
    }
  }

  async clearScores(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}
