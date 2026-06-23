import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuizState } from "./hooks/useQuizState";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { KIOSK_IDLE_TIMEOUT_MS } from "./constants";
import { BackgroundPattern } from "./components/BackgroundPattern";
import { StartScreen } from "./components/StartScreen";
import { QuizScreen } from "./components/QuizScreen";
import { ResultScreen } from "./components/ResultScreen";
import { Leaderboard } from "./components/Leaderboard";

export default function App() {
  const quiz = useQuizState();

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
