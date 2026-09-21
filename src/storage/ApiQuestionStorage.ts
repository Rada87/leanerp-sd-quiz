import type { Question, QuestionStorage } from "../types";
import { AdminAuthError, adminHeaders, handleAdminRejection } from "../utils/adminAuth";

const apiBase = `${import.meta.env.BASE_URL}api`;

async function request(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...adminHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    handleAdminRejection();
    throw new AdminAuthError();
  }
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
