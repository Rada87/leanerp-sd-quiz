import { getSupabaseClient } from "./supabaseClient";
import type { Question, QuestionOption, QuestionStorage } from "../types";

function fromRow(row: Record<string, unknown>): Question {
  return {
    id: row.id as string,
    category: row.category as string,
    question: row.question as string,
    options: row.options as QuestionOption[],
    correctOptionId: row.correct_option_id as string,
    explanation: row.explanation as string,
  };
}

function toRow(q: Question) {
  return {
    id: q.id,
    category: q.category,
    question: q.question,
    options: q.options,
    correct_option_id: q.correctOptionId,
    explanation: q.explanation,
  };
}

export class SupabaseQuestionStorage implements QuestionStorage {
  async getQuestions(): Promise<Question[]> {
    const { data, error } = await getSupabaseClient()
      .from("questions")
      .select("*")
      .order("id");
    if (error) throw new Error(error.message);
    return (data ?? []).map(fromRow);
  }

  async saveQuestion(question: Question): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("questions")
      .upsert(toRow(question), { onConflict: "id" });
    if (error) throw new Error(error.message);
  }

  async deleteQuestion(id: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("questions")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
