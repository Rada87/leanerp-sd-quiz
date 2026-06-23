import { useCallback, useReducer } from "react";
import type { AnswerRecord, AppScreen, Question } from "../types";
import { questions as questionBank } from "../data/questions";
import { calculatePoints } from "../utils/scoring";
import {
  MAX_POINTS_PER_QUESTION,
  QUESTION_TIME_SECONDS,
} from "../constants";
import { scoreStorage } from "../storage";

interface QuizState {
  screen: AppScreen;
  playerName: string;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  answerHistory: AnswerRecord[];
  selectedAnswer: string | null;
  isAnswered: boolean;
}

type QuizAction =
  | { type: "START_QUIZ"; playerName: string }
  | {
      type: "SELECT_ANSWER";
      optionId: string;
      remainingTime: number;
    }
  | { type: "HANDLE_TIMEOUT" }
  | { type: "CONTINUE_TO_NEXT" }
  | { type: "FINISH_QUIZ" }
  | { type: "GO_TO_LEADERBOARD" }
  | { type: "GO_TO_START" }
  | { type: "PLAY_AGAIN" };

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const initialState: QuizState = {
  screen: "start",
  playerName: "",
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  correctAnswers: 0,
  answerHistory: [],
  selectedAnswer: null,
  isAnswered: false,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "START_QUIZ": {
      return {
        ...initialState,
        screen: "quiz",
        playerName: action.playerName || "Guest",
        questions: shuffleArray(questionBank),
      };
    }
    case "SELECT_ANSWER": {
      if (state.isAnswered) return state;
      const currentQ = state.questions[state.currentQuestionIndex];
      const isCorrect = action.optionId === currentQ.correctOptionId;
      const points = isCorrect
        ? calculatePoints(action.remainingTime, QUESTION_TIME_SECONDS)
        : 0;
      const timeSpent = QUESTION_TIME_SECONDS - action.remainingTime;

      return {
        ...state,
        selectedAnswer: action.optionId,
        isAnswered: true,
        score: state.score + points,
        correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
        answerHistory: [
          ...state.answerHistory,
          {
            questionId: currentQ.id,
            selectedOptionId: action.optionId,
            isCorrect,
            pointsEarned: points,
            timeSpent,
          },
        ],
      };
    }
    case "HANDLE_TIMEOUT": {
      if (state.isAnswered) return state;
      const currentQ = state.questions[state.currentQuestionIndex];
      return {
        ...state,
        selectedAnswer: null,
        isAnswered: true,
        answerHistory: [
          ...state.answerHistory,
          {
            questionId: currentQ.id,
            selectedOptionId: null,
            isCorrect: false,
            pointsEarned: 0,
            timeSpent: QUESTION_TIME_SECONDS,
          },
        ],
      };
    }
    case "CONTINUE_TO_NEXT": {
      const isLast =
        state.currentQuestionIndex >= state.questions.length - 1;
      if (isLast) {
        return { ...state, screen: "result" };
      }
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        selectedAnswer: null,
        isAnswered: false,
      };
    }
    case "FINISH_QUIZ":
      return { ...state, screen: "result" };
    case "GO_TO_LEADERBOARD":
      return { ...state, screen: "leaderboard" };
    case "GO_TO_START":
      return { ...state, screen: "start" };
    case "PLAY_AGAIN":
      return { ...initialState, screen: "start" };
    default:
      return state;
  }
}

export function useQuizState() {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  const maxScore = state.questions.length * MAX_POINTS_PER_QUESTION;
  const percentage =
    maxScore > 0 ? Math.round((state.score / maxScore) * 100) : 0;

  const currentQuestion: Question | null =
    state.questions[state.currentQuestionIndex] ?? null;

  const lastAnswer: AnswerRecord | null =
    state.answerHistory[state.answerHistory.length - 1] ?? null;

  const startQuiz = useCallback((playerName: string) => {
    dispatch({ type: "START_QUIZ", playerName });
  }, []);

  const selectAnswer = useCallback(
    (optionId: string, remainingTime: number) => {
      dispatch({ type: "SELECT_ANSWER", optionId, remainingTime });
    },
    []
  );

  const handleTimeout = useCallback(() => {
    dispatch({ type: "HANDLE_TIMEOUT" });
  }, []);

  const continueToNext = useCallback(() => {
    dispatch({ type: "CONTINUE_TO_NEXT" });
  }, []);

  const saveAndShowResult = useCallback(async () => {
    const maxS = state.questions.length * MAX_POINTS_PER_QUESTION;
    const pct = maxS > 0 ? Math.round((state.score / maxS) * 100) : 0;
    await scoreStorage.saveScore({
      id: crypto.randomUUID(),
      playerName: state.playerName,
      score: state.score,
      maxScore: maxS,
      percentage: pct,
      correctAnswers: state.correctAnswers,
      totalQuestions: state.questions.length,
      createdAt: new Date().toISOString(),
    });
    dispatch({ type: "CONTINUE_TO_NEXT" });
  }, [state.score, state.playerName, state.correctAnswers, state.questions.length]);

  const finishQuiz = useCallback(async () => {
    const answered = state.answerHistory.length;
    const total = state.questions.length;
    const maxS = total * MAX_POINTS_PER_QUESTION;
    const pct = maxS > 0 ? Math.round((state.score / maxS) * 100) : 0;
    await scoreStorage.saveScore({
      id: crypto.randomUUID(),
      playerName: state.playerName,
      score: state.score,
      maxScore: maxS,
      percentage: pct,
      correctAnswers: state.correctAnswers,
      totalQuestions: total,
      createdAt: new Date().toISOString(),
    });
    dispatch({ type: "FINISH_QUIZ" });
  }, [state.answerHistory.length, state.questions.length, state.score, state.playerName, state.correctAnswers]);

  const goToLeaderboard = useCallback(() => {
    dispatch({ type: "GO_TO_LEADERBOARD" });
  }, []);

  const goToStart = useCallback(() => {
    dispatch({ type: "GO_TO_START" });
  }, []);

  const playAgain = useCallback(() => {
    dispatch({ type: "PLAY_AGAIN" });
  }, []);

  return {
    screen: state.screen,
    playerName: state.playerName,
    currentQuestion,
    currentQuestionIndex: state.currentQuestionIndex,
    totalQuestions: state.questions.length,
    score: state.score,
    maxScore,
    percentage,
    correctAnswers: state.correctAnswers,
    selectedAnswer: state.selectedAnswer,
    isAnswered: state.isAnswered,
    lastAnswer,
    answerHistory: state.answerHistory,
    startQuiz,
    selectAnswer,
    handleTimeout,
    continueToNext,
    saveAndShowResult,
    finishQuiz,
    goToLeaderboard,
    goToStart,
    playAgain,
  };
}
