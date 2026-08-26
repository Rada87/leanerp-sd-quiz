import type { ScoreRecord } from "../types";

export interface SaveScoreResult {
  rank: number | null;
  totalPlayers: number | null;
}

export interface ScoreStorage {
  saveScore(record: ScoreRecord, options?: { broadcast?: boolean }): Promise<SaveScoreResult>;
  getScores(): Promise<ScoreRecord[]>;
  deleteScore(id: string): Promise<void>;
  clearScores(): Promise<void>;
  exportScores(): Promise<ScoreRecord[]>;
  importScores(records: ScoreRecord[]): Promise<void>;
}
