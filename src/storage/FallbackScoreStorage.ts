import type { ScoreRecord } from "../types";
import type { SaveScoreResult, ScoreStorage } from "./ScoreStorage";
import { logActivity } from "../utils/activity";
import { AdminAuthError } from "../utils/adminAuth";

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
      if (error instanceof AdminAuthError) throw error;
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
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      return this.fallback.getScores();
    }
  }

  async deleteScore(id: string): Promise<void> {
    try {
      await this.primary.deleteScore(id);
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      await this.fallback.deleteScore(id);
    }
  }

  async clearScores(): Promise<void> {
    try {
      await this.primary.clearScores();
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      await this.fallback.clearScores();
    }
  }

  async exportScores(): Promise<ScoreRecord[]> {
    try {
      return await this.primary.exportScores();
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      return this.fallback.exportScores();
    }
  }

  async importScores(records: ScoreRecord[]): Promise<void> {
    try {
      await this.primary.importScores(records);
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      await this.fallback.importScores(records);
    }
  }
}
