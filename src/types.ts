export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  category: string;
  question: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
}

export type AppScreen = "start" | "quiz" | "result" | "leaderboard";

export interface ScoreRecord {
  id: string;
  playerName: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: string;
}

export interface AnswerRecord {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number;
}

export interface TierInfo {
  name: string;
  description: string;
}
