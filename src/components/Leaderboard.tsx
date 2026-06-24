import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { ScoreRecord } from "../types";
import { scoreStorage } from "../storage";
import { formatDate } from "../utils/format";

interface LeaderboardProps {
  onBack: () => void;
}

const DELETE_THRESHOLD = -80;

interface RowProps {
  record: ScoreRecord;
  index: number;
  onDelete: (id: string) => void;
}

function SwipeableRow({ record, index, onDelete }: RowProps) {
  const x = useMotionValue(0);

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.offset.x < DELETE_THRESHOLD) {
      await animate(x, -400, { duration: 0.18 });
      onDelete(record.id);
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
    }
  }

  const isFirst = index === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -300, transition: { duration: 0.18 } }}
      transition={{ delay: index * 0.05 }}
      style={{ position: "relative", borderRadius: "var(--radius-sm)", overflow: "hidden" }}
    >
      {/* Delete hint shown behind the row */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#c0392b",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 20,
          borderRadius: "var(--radius-sm)",
        }}
      >
        <span style={{ fontSize: "1.3rem" }}>🗑️</span>
      </div>

      {/* Draggable row */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.08, right: 0.02 }}
        style={{
          x,
          display: "grid",
          gridTemplateColumns: "36px 1fr auto",
          alignItems: "center",
          gap: 16,
          padding: "14px 16px",
          background: isFirst ? "rgba(109, 255, 163, 0.06)" : "var(--color-bg)",
          border: `1px solid ${isFirst ? "rgba(109, 255, 163, 0.15)" : "var(--color-border)"}`,
          borderRadius: "var(--radius-sm)",
          cursor: "grab",
          userSelect: "none",
          touchAction: "pan-y",
        }}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
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
            color: index < 1 ? "var(--color-bg)" : "var(--color-text)",
          }}
        >
          {index + 1}
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
            {record.playerName}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            {record.correctAnswers}/{record.totalQuestions} correct
            &middot; {formatDate(record.createdAt)}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.1rem",
              color: isFirst ? "var(--color-primary)" : "var(--color-text)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {record.score}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            {record.percentage}%
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
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

  const handleDelete = useCallback(async (id: string) => {
    setScores((prev) => prev.filter((r) => r.id !== id));
    await scoreStorage.deleteScore(id);
  }, []);

  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <motion.div
        className="screen-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Leaderboard</h2>
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
          <>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                textAlign: "right",
                marginBottom: 8,
                opacity: 0.7,
              }}
            >
              ← swipe to delete
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <AnimatePresence mode="popLayout">
                {scores.map((record, index) => (
                  <SwipeableRow
                    key={record.id}
                    record={record}
                    index={index}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
          <motion.button
            className="btn-primary"
            onClick={onBack}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Back to Start
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
