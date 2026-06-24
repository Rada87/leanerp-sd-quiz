import type { Question, QuestionStorage } from "../types";
import { SupabaseQuestionStorage } from "./SupabaseQuestionStorage";
import { StaticJsonQuestionStorage } from "./StaticJsonQuestionStorage";

const supabase = new SupabaseQuestionStorage();
const staticJson = new StaticJsonQuestionStorage();

export let questionSource: "supabase" | "local" | "unknown" = "unknown";

export const questionStorage: QuestionStorage = {
  async getQuestions(): Promise<Question[]> {
    try {
      const qs = await supabase.getQuestions();
      if (qs.length > 0) {
        questionSource = "supabase";
        return qs;
      }
    } catch {
      // fall through to static JSON
    }
    questionSource = "local";
    return staticJson.getQuestions();
  },

  async saveQuestion(question: Question): Promise<void> {
    return supabase.saveQuestion(question);
  },

  async deleteQuestion(id: string): Promise<void> {
    return supabase.deleteQuestion(id);
  },
};
