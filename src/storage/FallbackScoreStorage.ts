import type { ScoreRecord } from "../types";
import type { ScoreStorage } from "./ScoreStorage";

export class FallbackScoreStorage implements ScoreStorage {
  private primary: ScoreStorage;
  private fallback: ScoreStorage;

  constructor(primary: ScoreStorage, fallback: ScoreStorage) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async saveScore(record: ScoreRecord): Promise<void> {
    try {
      await this.primary.saveScore(record);
    } catch {
      await this.fallback.saveScore(record);
    }
  }

  async getScores(): Promise<ScoreRecord[]> {
    try {
      return await this.primary.getScores();
    } catch {
      return this.fallback.getScores();
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
