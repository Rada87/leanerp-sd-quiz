import type { Question, QuestionStorage } from "../types";

const apiBase = `${import.meta.env.BASE_URL}api`;

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);
  return res;
}

export class ApiQuestionStorage implements QuestionStorage {
  async getQuestions(): Promise<Question[]> {
    const res = await request("/questions");
    return res.json();
  }

  async saveQuestion(question: Question): Promise<void> {
    await request("/questions", { method: "POST", body: JSON.stringify(question) });
  }

  async deleteQuestion(id: string): Promise<void> {
    await request(`/questions/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
