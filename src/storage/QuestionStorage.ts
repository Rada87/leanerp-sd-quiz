import type { Question, QuestionStorage } from "../types";
import { ApiQuestionStorage } from "./ApiQuestionStorage";
import { StaticJsonQuestionStorage } from "./StaticJsonQuestionStorage";

const api = new ApiQuestionStorage();
const staticJson = new StaticJsonQuestionStorage();

export let questionSource: "server" | "local" | "unknown" = "unknown";

export const questionStorage: QuestionStorage = {
  async getQuestions(): Promise<Question[]> {
    try {
      const qs = await api.getQuestions();
      if (qs.length > 0) {
        questionSource = "server";
        return qs;
      }
    } catch {
      // fall through to static JSON
    }
    questionSource = "local";
    return staticJson.getQuestions();
  },

  async saveQuestion(question: Question): Promise<void> {
    return api.saveQuestion(question);
  },

  async deleteQuestion(id: string): Promise<void> {
    return api.deleteQuestion(id);
  },
};
