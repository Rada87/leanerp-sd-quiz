import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "../types";
import { AnswerButton } from "./AnswerButton";
import { Confetti } from "./Confetti";

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  selectedAnswer: string | null;
  isAnswered: boolean;
  pointsEarned: number;
  onSelectAnswer: (optionId: string) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  isAnswered,
  pointsEarned,
  onSelectAnswer,
}: QuestionCardProps) {
  const isCorrect = selectedAnswer === question.correctOptionId;
  const isTimeout = isAnswered && selectedAnswer === null;

  function getOptionState(optionId: string) {
    if (!isAnswered) return "default" as const;
    if (optionId === question.correctOptionId) {
      return optionId === selectedAnswer
        ? ("selected-correct" as const)
        : ("revealed-correct" as const);
    }
    if (optionId === selectedAnswer) return "selected-wrong" as const;
    return "disabled" as const;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={questionIndex}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        <div style={{ marginBottom: 8 }}>
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--color-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {question.category}
          </span>
        </div>

        <h2
          style={{
            fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
            fontWeight: 700,
            lineHeight: 1.4,
            marginBottom: 24,
          }}
        >
          {question.question}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {question.options.map((opt, i) => (
            <AnswerButton
              key={opt.id}
              text={opt.text}
              label={OPTION_LABELS[i]}
              state={getOptionState(opt.id)}
              onSelect={() => onSelectAnswer(opt.id)}
            />
          ))}
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              style={{
                marginTop: 20,
                padding: "16px 20px",
                borderRadius: "var(--radius-sm)",
                background: isCorrect
                  ? "rgba(109, 255, 163, 0.08)"
                  : "rgba(255, 77, 106, 0.08)",
                border: `1px solid ${
                  isCorrect
                    ? "rgba(109, 255, 163, 0.2)"
                    : "rgba(255, 77, 106, 0.2)"
                }`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: isCorrect
                    ? "var(--color-primary)"
                    : "var(--color-error)",
                  marginBottom: 4,
                }}
              >
                {isCorrect
                  ? `Correct! +${pointsEarned} pts`
                  : isTimeout
                    ? "Time's up!"
                    : "Not quite!"}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--color-text-muted)",
                  lineHeight: 1.5,
                }}
              >
                {question.explanation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnswered && isCorrect && <Confetti count={16} spread={200} />}
      </motion.div>
    </AnimatePresence>
  );
}
