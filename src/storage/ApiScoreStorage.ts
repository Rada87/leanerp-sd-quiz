import type { ScoreRecord } from "../types";
import type { SaveScoreResult, ScoreStorage } from "./ScoreStorage";

const apiBase = `${import.meta.env.BASE_URL}api`;

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);
  return res;
}

export class ApiScoreStorage implements ScoreStorage {
  async saveScore(record: ScoreRecord, options?: { broadcast?: boolean }): Promise<SaveScoreResult> {
    const res = await request("/scores", {
      method: "POST",
      body: JSON.stringify({ ...record, broadcast: options?.broadcast ?? true }),
    });
    const data = await res.json();
    return { rank: data.rank ?? null, totalPlayers: data.totalPlayers ?? null };
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
