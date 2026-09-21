import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import type { ScoreRecord } from "../types";
import { scoreStorage } from "../storage";
import { formatDate } from "../utils/format";
import { useAdminUnlocked } from "../utils/adminAuth";

interface LeaderboardProps {
  onBack: () => void;
}

const DELETE_THRESHOLD = -160;

interface RowProps {
  record: ScoreRecord;
  index: number;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

// Swipe-to-delete is a maintenance action on a screen every player can open,
// so the row only becomes draggable once the admin panel has been unlocked.
function SwipeableRow({ record, index, canDelete, onDelete }: RowProps) {
  const x = useMotionValue(0);
  const isFirst = index === 0;

  return (
    <motion.div
      key={record.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${isFirst ? "rgba(120, 250, 174, 0.15)" : "var(--color-border)"}`,
        background: "#c0392b",
      }}
    >
      {/* Draggable content */}
      <motion.div
        drag={canDelete ? "x" : false}
        dragConstraints={{ left: -220, right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={async (_, info) => {
          if (info.offset.x < DELETE_THRESHOLD) {
            await animate(x, -400, { duration: 0.18 });
            onDelete(record.id);
          } else {
            animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
          }
        }}
        style={{ x,
          display: "grid",
          gridTemplateColumns: "36px 1fr auto",
          alignItems: "center",
          gap: 16,
          padding: "14px 16px",
          background: isFirst ? "#141d17" : "var(--color-bg-card)",
          borderRadius: "7px",
          cursor: canDelete ? "grab" : "default",
          userSelect: "none",
          touchAction: "pan-y",
          position: "relative",
        }}
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
                  ? "rgba(120, 250, 174, 0.3)"
                  : index === 2
                    ? "rgba(120, 250, 174, 0.15)"
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

const POLL_INTERVAL_MS = 3000;

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const adminUnlocked = useAdminUnlocked();

  const loadScores = useCallback(async () => {
    const data = await scoreStorage.getScores();
    setScores((prev) => {
      const same =
        prev.length === data.length &&
        prev.every((r, i) => r.id === data[i].id && r.score === data[i].score);
      return same ? prev : data;
    });
  }, []);

  useEffect(() => {
    loadScores();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadScores();
      }
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadScores();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadScores]);

  const handleDelete = useCallback(async (id: string) => {
    const previous = scores;
    setScores((prev) => prev.filter((r) => r.id !== id));
    try {
      await scoreStorage.deleteScore(id);
    } catch {
      // Rejected (most likely a locked admin session) — put the row back.
      setScores(previous);
    }
  }, [scores]);

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
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AnimatePresence>
              {scores.map((record, index) => (
                <SwipeableRow
                  key={record.id}
                  record={record}
                  index={index}
                  canDelete={adminUnlocked}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
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
