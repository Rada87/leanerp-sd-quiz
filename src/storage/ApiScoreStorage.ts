import type { ScoreRecord } from "../types";
import type { ScoreStorage } from "./ScoreStorage";

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);
  return res;
}

export class ApiScoreStorage implements ScoreStorage {
  async saveScore(record: ScoreRecord): Promise<void> {
    await request("/scores", { method: "POST", body: JSON.stringify(record) });
  }

  async getScores(): Promise<ScoreRecord[]> {
    const res = await request("/scores");
    return res.json();
  }

  async deleteScore(id: string): Promise<void> {
    await request(`/scores/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async clearScores(): Promise<void> {
    await request("/scores", { method: "DELETE" });
  }

  async exportScores(): Promise<ScoreRecord[]> {
    const res = await request("/scores/export");
    return res.json();
  }

  async importScores(records: ScoreRecord[]): Promise<void> {
    if (!records.length) return;
    await request("/scores/import", { method: "POST", body: JSON.stringify(records) });
  }
}
