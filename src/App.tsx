import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuizState } from "./hooks/useQuizState";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { SettingsProvider } from "./hooks/useSettings";
import { KIOSK_IDLE_TIMEOUT_MS } from "./constants";
import { BackgroundPattern } from "./components/BackgroundPattern";
import { StartScreen } from "./components/StartScreen";
import { QuizScreen } from "./components/QuizScreen";
import { ResultScreen } from "./components/ResultScreen";
import { Leaderboard } from "./components/Leaderboard";
import { SettingsPanel } from "./components/SettingsPanel";

function GearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      style={{ display: "block" }}
    >
      <path
        fillRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AppContent() {
  const quiz = useQuizState();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleIdleReset = useCallback(() => {
    quiz.goToStart();
  }, [quiz.goToStart]);

  useIdleTimeout(
    KIOSK_IDLE_TIMEOUT_MS,
    handleIdleReset,
    quiz.screen === "result" || quiz.screen === "leaderboard"
  );

  const handleContinue = useCallback(() => {
    const isLast = quiz.currentQuestionIndex >= quiz.totalQuestions - 1;
    if (isLast && quiz.isAnswered) {
      quiz.saveAndShowResult();
    } else {
      quiz.continueToNext();
    }
  }, [
    quiz.currentQuestionIndex,
    quiz.totalQuestions,
    quiz.isAnswered,
    quiz.saveAndShowResult,
    quiz.continueToNext,
  ]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ minHeight: "100dvh" }}
    >
      <BackgroundPattern />

      <button
        onClick={() => setSettingsOpen((v) => !v)}
        aria-label="Settings"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "transparent",
          color: "var(--color-text-muted)",
          opacity: 0.4,
          transition: "opacity 0.2s, color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
          e.currentTarget.style.color = "var(--color-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.4";
          e.currentTarget.style.color = "var(--color-text-muted)";
        }}
      >
        <GearIcon />
      </button>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <AnimatePresence mode="wait">
        {quiz.screen === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StartScreen onStart={quiz.startQuiz} />
          </motion.div>
        )}

        {quiz.screen === "quiz" && quiz.currentQuestion && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <QuizScreen
              question={quiz.currentQuestion}
              questionIndex={quiz.currentQuestionIndex}
              totalQuestions={quiz.totalQuestions}
              score={quiz.score}
              selectedAnswer={quiz.selectedAnswer}
              isAnswered={quiz.isAnswered}
              pointsEarned={quiz.lastAnswer?.pointsEarned ?? 0}
              onSelectAnswer={quiz.selectAnswer}
              onTimeout={quiz.handleTimeout}
              onContinue={handleContinue}
              onFinish={quiz.finishQuiz}
            />
          </motion.div>
        )}

        {quiz.screen === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ResultScreen
              score={quiz.score}
              maxScore={quiz.maxScore}
              percentage={quiz.percentage}
              correctAnswers={quiz.correctAnswers}
              totalQuestions={quiz.totalQuestions}
              playerName={quiz.playerName}
              onPlayAgain={quiz.playAgain}
              onLeaderboard={quiz.goToLeaderboard}
            />
          </motion.div>
        )}

        {quiz.screen === "leaderboard" && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Leaderboard onBack={quiz.goToStart} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
