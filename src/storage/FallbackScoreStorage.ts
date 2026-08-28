import type { ScoreRecord } from "../types";
import type { SaveScoreResult, ScoreStorage } from "./ScoreStorage";
import { logActivity } from "../utils/activity";

export class FallbackScoreStorage implements ScoreStorage {
  private primary: ScoreStorage;
  private fallback: ScoreStorage;

  constructor(primary: ScoreStorage, fallback: ScoreStorage) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async saveScore(record: ScoreRecord, options?: { broadcast?: boolean }): Promise<SaveScoreResult> {
    try {
      return await this.primary.saveScore(record, options);
    } catch (error) {
      logActivity("score_storage_fallback", {
        operation: "saveScore",
        message: error instanceof Error ? error.message : "Primary score storage failed",
      });
      return await this.fallback.saveScore(record, options);
    }
  }

  async getScores(): Promise<ScoreRecord[]> {
    try {
      return await this.primary.getScores();
    } catch {
      return this.fallback.getScores();
    }
  }

  async deleteScore(id: string): Promise<void> {
    try {
      await this.primary.deleteScore(id);
    } catch {
      await this.fallback.deleteScore(id);
    }
  }

  async clearScores(): Promise<void> {
    try {
      await this.primary.clearScores();
    } catch {
      await this.fallback.clearScores();
    }
  }

  async exportScores(): Promise<ScoreRecord[]> {
    try {
      return await this.primary.exportScores();
    } catch {
      return this.fallback.exportScores();
    }
  }

  async importScores(records: ScoreRecord[]): Promise<void> {
    try {
      await this.primary.importScores(records);
    } catch {
      await this.fallback.importScores(records);
    }
  }
}
