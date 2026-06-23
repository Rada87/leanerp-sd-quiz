import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ScoreRecord } from "../types";
import { scoreStorage } from "../storage";
import { formatDate } from "../utils/format";

interface LeaderboardProps {
  onBack: () => void;
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreRecord[]>([]);

  const loadScores = useCallback(async () => {
    const data = await scoreStorage.getScores();
    setScores(data);
  }, []);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const handleClear = async () => {
    if (window.confirm("Clear all leaderboard data? This cannot be undone.")) {
      await scoreStorage.clearScores();
      setScores([]);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <motion.div
        className="screen-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ maxWidth: 650, margin: "0 auto" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Leaderboard
          </h2>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-primary)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Top 10
          </div>
        </div>

        {scores.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--color-text-muted)",
            }}
          >
            No scores yet. Be the first to play!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scores.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 16px",
                  background:
                    index === 0
                      ? "rgba(109, 255, 163, 0.06)"
                      : "var(--color-bg)",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${
                    index === 0
                      ? "rgba(109, 255, 163, 0.15)"
                      : "var(--color-border)"
                  }`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    background:
                      index === 0
                        ? "var(--color-primary)"
                        : index === 1
                          ? "rgba(109, 255, 163, 0.3)"
                          : index === 2
                            ? "rgba(109, 255, 163, 0.15)"
                            : "var(--color-border)",
                    color:
                      index < 1 ? "var(--color-bg)" : "var(--color-text)",
                  }}
                >
                  {index + 1}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {record.playerName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {record.correctAnswers}/{record.totalQuestions} correct
                    &middot; {formatDate(record.createdAt)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color:
                        index === 0
                          ? "var(--color-primary)"
                          : "var(--color-text)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {record.score}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {record.percentage}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 24,
          }}
        >
          <motion.button
            className="btn-primary"
            onClick={onBack}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Back to Start
          </motion.button>
          {scores.length > 0 && (
            <button className="btn-danger" onClick={handleClear}>
              Clear Leaderboard
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
