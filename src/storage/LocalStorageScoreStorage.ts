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

  async deleteScore(id: string): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const scores: ScoreRecord[] = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.filter((r) => r.id !== id)));
    } catch {
      // silently drop
    }
  }

  async clearScores(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }

  async exportScores(): Promise<ScoreRecord[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async importScores(records: ScoreRecord[]): Promise<void> {
    try {
      const existing = await this.exportScores();
      const ids = new Set(existing.map((r) => r.id));
      const merged = [...existing, ...records.filter((r) => !ids.has(r.id))];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // silently drop
    }
  }
}
