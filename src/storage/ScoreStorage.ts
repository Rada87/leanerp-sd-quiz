import type { ScoreRecord } from "../types";

export interface ScoreStorage {
  saveScore(record: ScoreRecord): Promise<void>;
  getScores(): Promise<ScoreRecord[]>;
  deleteScore(id: string): Promise<void>;
  clearScores(): Promise<void>;
  exportScores(): Promise<ScoreRecord[]>;
  importScores(records: ScoreRecord[]): Promise<void>;
}
