import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getTier } from "../utils/format";
import { useSettings } from "../hooks/useSettings";
import { playComplete } from "../utils/sounds";
import { Confetti } from "./Confetti";

interface ResultScreenProps {
  score: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  playerName: string;
  onPlayAgain: () => void;
  onLeaderboard: () => void;
}

export function ResultScreen({
  score,
  maxScore,
  percentage,
  correctAnswers,
  totalQuestions,
  playerName,
  onPlayAgain,
  onLeaderboard,
}: ResultScreenProps) {
  const { settings } = useSettings();
  const tier = getTier(percentage);
  const [displayScore, setDisplayScore] = useState(0);
  const [showTier, setShowTier] = useState(false);

  useEffect(() => {
    if (settings.soundEnabled) playComplete();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const duration = 2500;
    const steps = 60;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.min(Math.round(score * eased), score));
      if (step >= steps) {
        clearInterval(interval);
        setShowTier(true);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [score]);

  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <Confetti count={80} spread={500} />

      <motion.div
        className="screen-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", maxWidth: 850, margin: "0 auto" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: "0.85rem",
            color: "var(--color-text-muted)",
            marginBottom: 8,
          }}
        >
          Great job, {playerName}!
        </motion.div>

        <div
          style={{
            fontSize: "clamp(3rem, 8vw, 4.5rem)",
            fontWeight: 800,
            color: "var(--color-primary)",
            lineHeight: 1,
            marginBottom: 4,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayScore}
        </div>
        <div
          style={{
            fontSize: "1rem",
            color: "var(--color-text-muted)",
            marginBottom: 24,
          }}
        >
          out of {maxScore} points
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginBottom: 32,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: 700,
                color: "var(--color-primary)",
              }}
            >
              {percentage}%
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              accuracy
            </div>
          </div>
          <div
            style={{
              width: 1,
              background: "var(--color-border)",
            }}
          />
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>
              {correctAnswers}/{totalQuestions}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              correct
            </div>
          </div>
        </div>

        {showTier && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--color-primary)",
                marginBottom: 8,
              }}
            >
              Your rank
            </div>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {tier.name}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--color-text-muted)",
                lineHeight: 1.5,
              }}
            >
              {tier.description}
            </div>
          </motion.div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <motion.button
            className="btn-primary"
            onClick={onPlayAgain}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Play Again
          </motion.button>
          <motion.button
            className="btn-secondary"
            onClick={onLeaderboard}
            whileTap={{ scale: 0.97 }}
          >
            View Leaderboard
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
