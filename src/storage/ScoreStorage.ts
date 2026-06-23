import type { ScoreRecord } from "../types";

export interface ScoreStorage {
  saveScore(record: ScoreRecord): Promise<void>;
  getScores(): Promise<ScoreRecord[]>;
  clearScores(): Promise<void>;
}
