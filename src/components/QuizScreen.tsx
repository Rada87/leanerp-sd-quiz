import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { Question } from "../types";
import { FEEDBACK_AUTO_ADVANCE_MS, QUESTION_TIME_SECONDS } from "../constants";
import { useTimer } from "../hooks/useTimer";
import { calculatePoints } from "../utils/scoring";
import { QuestionCard } from "./QuestionCard";
import { TimerBar } from "./TimerBar";

interface QuizScreenProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  selectedAnswer: string | null;
  isAnswered: boolean;
  pointsEarned: number;
  onSelectAnswer: (optionId: string, remainingTime: number) => void;
  onTimeout: () => void;
  onContinue: () => void;
  onFinish: () => void;
}

export function QuizScreen({
  question,
  questionIndex,
  totalQuestions,
  score,
  selectedAnswer,
  isAnswered,
  pointsEarned,
  onSelectAnswer,
  onTimeout,
  onContinue,
  onFinish,
}: QuizScreenProps) {
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExpire = useCallback(() => {
    onTimeout();
  }, [onTimeout]);

  const { remainingTime, resetTimer } = useTimer({
    durationSeconds: QUESTION_TIME_SECONDS,
    onExpire: handleExpire,
    isRunning: !isAnswered,
  });

  // Reset timer when question changes
  useEffect(() => {
    resetTimer();
  }, [questionIndex, resetTimer]);

  // Auto-advance after feedback
  useEffect(() => {
    if (isAnswered) {
      autoAdvanceRef.current = setTimeout(onContinue, FEEDBACK_AUTO_ADVANCE_MS);
    }
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [isAnswered, onContinue]);

  const handleSelectAnswer = (optionId: string) => {
    onSelectAnswer(optionId, remainingTime);
  };

  const potentialPoints = isAnswered
    ? 0
    : calculatePoints(remainingTime, QUESTION_TIME_SECONDS);

  return (
    <div className="app-container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Score panel - top on all sizes for quiz flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-muted)",
              fontWeight: 600,
            }}
          >
            Question{" "}
            <span style={{ color: "var(--color-primary)" }}>
              {questionIndex + 1}
            </span>{" "}
            / {totalQuestions}
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 2,
                }}
              >
                Potential
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                +{potentialPoints}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 2,
                }}
              >
                Score
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {score}
              </div>
            </div>
          </div>
        </div>

        {/* Timer */}
        <TimerBar
          remainingTime={remainingTime}
          totalTime={QUESTION_TIME_SECONDS}
        />

        {/* Question card */}
        <div className="screen-card" style={{ padding: "32px" }}>
          <QuestionCard
            question={question}
            questionIndex={questionIndex}
            selectedAnswer={selectedAnswer}
            isAnswered={isAnswered}
            pointsEarned={pointsEarned}
            onSelectAnswer={handleSelectAnswer}
          />

          {isAnswered && (
            <motion.button
              className="btn-secondary"
              onClick={onContinue}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileTap={{ scale: 0.97 }}
              style={{ marginTop: 20 }}
            >
              Continue
            </motion.button>
          )}
        </div>

        <button
          onClick={onFinish}
          style={{
            alignSelf: "center",
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: "0.8rem",
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            opacity: 0.5,
            transition: "opacity 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.color = "var(--color-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.5";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          Finish Quiz
        </button>
      </div>
    </div>
  );
}
