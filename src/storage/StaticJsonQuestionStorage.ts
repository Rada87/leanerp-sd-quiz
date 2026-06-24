import type { Question, QuestionStorage } from "../types";

export class StaticJsonQuestionStorage implements QuestionStorage {
  async getQuestions(): Promise<Question[]> {
    const res = await fetch(`${import.meta.env.BASE_URL}questions.json`);
    if (!res.ok) throw new Error(`Failed to fetch questions.json: ${res.status}`);
    return res.json();
  }

  async saveQuestion(_q: Question): Promise<void> {
    throw new Error("Static JSON is read-only");
  }

  async deleteQuestion(_id: string): Promise<void> {
    throw new Error("Static JSON is read-only");
  }
}
