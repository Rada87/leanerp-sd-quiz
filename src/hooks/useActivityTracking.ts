import { useEffect, useRef } from "react";
import type { AnswerRecord, AppScreen, Question } from "../types";
import {
  getQuizActivityId,
  logActivity,
  setActivityScreen,
} from "../utils/activity";

interface ActivityTrackingState {
  screen: AppScreen;
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  answerHistory: AnswerRecord[];
}

export function useActivityTracking(state: ActivityTrackingState): void {
  const previousScreen = useRef<AppScreen | null>(null);
  const lastQuestionKey = useRef("");
  const loggedAnswerCount = useRef(0);
  const completedRun = useRef<string | null>(null);
  const runStartedAt = useRef<number | null>(null);
  const activeQuizSnapshot = useRef({ questionIndex: 0, answeredCount: 0 });

  useEffect(() => {
    setActivityScreen(state.screen);
    if (previousScreen.current === state.screen) return;
    const previous = previousScreen.current;
    previousScreen.current = state.screen;
    logActivity("screen_viewed", { previousScreen: previous || undefined });
    if (state.screen === "leaderboard") logActivity("leaderboard_viewed");
    if (state.screen === "activity") logActivity("activity_report_viewed");
  }, [state.screen]);

  useEffect(() => {
    const runId = getQuizActivityId();
    if (state.screen !== "quiz" || !state.currentQuestion || !runId) return;
    if (runStartedAt.current === null) runStartedAt.current = Date.now();
    const key = `${runId}:${state.currentQuestionIndex}:${state.currentQuestion.id}`;
    if (lastQuestionKey.current === key) return;
    lastQuestionKey.current = key;
    logActivity("question_viewed", {
      questionId: state.currentQuestion.id,
      category: state.currentQuestion.category,
      questionIndex: state.currentQuestionIndex,
      totalQuestions: state.totalQuestions,
    });
  }, [state.screen, state.currentQuestion, state.currentQuestionIndex, state.totalQuestions]);

  useEffect(() => {
    activeQuizSnapshot.current = {
      questionIndex: state.currentQuestionIndex,
      answeredCount: state.answerHistory.length,
    };
    if (state.answerHistory.length <= loggedAnswerCount.current) return;
    const answer = state.answerHistory[state.answerHistory.length - 1];
    loggedAnswerCount.current = state.answerHistory.length;
    const metadata = {
      questionId: answer.questionId,
      category: state.currentQuestion?.category || "",
      questionIndex: state.currentQuestionIndex,
      timeSpentSeconds: answer.timeSpent,
    };
    if (answer.selectedOptionId === null) {
      logActivity("question_timed_out", metadata);
    } else {
      const optionIndex = state.currentQuestion?.options.findIndex(
        (option) => option.id === answer.selectedOptionId
      ) ?? -1;
      logActivity("question_answered", {
        ...metadata,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned,
        selectedOptionId: answer.selectedOptionId,
        selectedOptionLabel: optionIndex >= 0 ? String.fromCharCode(65 + optionIndex) : "?",
      });
    }
  }, [state.answerHistory, state.currentQuestion, state.currentQuestionIndex]);

  useEffect(() => {
    const runId = getQuizActivityId();
    if (state.screen !== "result" || !runId || completedRun.current === runId) return;
    completedRun.current = runId;
    logActivity("quiz_completed", {
      score: state.score,
      maxScore: state.maxScore,
      percentage: state.percentage,
      correctAnswers: state.correctAnswers,
      totalQuestions: state.totalQuestions,
      durationMs: runStartedAt.current === null ? 0 : Date.now() - runStartedAt.current,
    });
  }, [
    state.screen,
    state.score,
    state.maxScore,
    state.percentage,
    state.correctAnswers,
    state.totalQuestions,
  ]);

  useEffect(() => {
    if (state.screen !== "quiz") return;
    const onPageHide = () => {
      const snapshot = activeQuizSnapshot.current;
      logActivity("quiz_abandoned", {
        questionIndex: snapshot.questionIndex,
        answeredCount: snapshot.answeredCount,
        durationMs: runStartedAt.current === null ? 0 : Date.now() - runStartedAt.current,
        reason: "page_hidden",
      }, { beacon: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [state.screen]);

  useEffect(() => {
    if (state.screen !== "start") return;
    lastQuestionKey.current = "";
    loggedAnswerCount.current = 0;
    runStartedAt.current = null;
  }, [state.screen]);
}
