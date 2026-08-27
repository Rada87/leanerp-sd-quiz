import { AnimatePresence, motion } from "framer-motion";
import type { QueueSnapshot } from "../hooks/useQueue";

interface WaitingScreenProps {
  snapshot: QueueSnapshot;
  clientId: string;
  onStart: () => void;
  onLeave: () => void;
}

function initials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : trimmed.slice(0, 2)).toUpperCase();
}

/** Pulsing ring that reads as "someone is playing right now". */
function LiveDot() {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <motion.span
        animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "var(--color-primary)",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--color-primary)",
        }}
      />
    </span>
  );
}

export function WaitingScreen({ snapshot, clientId, onStart, onLeave }: WaitingScreenProps) {
  const isReady = snapshot.state === "ready";
  // The full line, in order, with the player's own seat marked.
  const line = [
    ...(snapshot.ready ? [snapshot.ready] : []),
    ...snapshot.waiting,
  ];

  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <motion.div
        className="screen-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: "center", overflow: "hidden", position: "relative" }}
      >
        {/* Now playing — omitted when the quiz is free, which is the case
            for the player whose turn has just come up. */}
        {snapshot.active && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              fontSize: "0.8rem",
              marginBottom: 28,
            }}
          >
            <LiveDot />
            <span style={{ color: "var(--color-text-muted)" }}>Now playing</span>
            <strong>{snapshot.active.playerName}</strong>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isReady ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--color-primary)",
                  marginBottom: 8,
                }}
              >
                You're up!
              </motion.div>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 28 }}>
                The quiz is yours — tap when you're ready.
              </p>
              <motion.button
                className="btn-primary"
                onClick={onStart}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(109, 255, 163, 0.4)",
                    "0 0 0 18px rgba(109, 255, 163, 0)",
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                style={{ width: "100%" }}
              >
                Start My Quiz
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                You're in line
              </div>
              {/* Position pops each time the queue advances */}
              <div style={{ height: 96, display: "grid", placeItems: "center" }}>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={snapshot.position}
                    initial={{ scale: 0.4, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.4, opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 340, damping: 22 }}
                    style={{
                      fontSize: "4.5rem",
                      fontWeight: 800,
                      lineHeight: 1,
                      color: "var(--color-primary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    #{snapshot.position}
                  </motion.div>
                </AnimatePresence>
              </div>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                {snapshot.position === 1
                  ? "You're next — hang tight!"
                  : `${snapshot.position - 1} ${snapshot.position - 1 === 1 ? "player" : "players"} ahead of you`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The line itself — chips slide forward as people finish */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 28,
            paddingTop: 24,
            borderTop: "1px solid var(--color-border)",
            minHeight: 44,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {line.map((member, index) => {
              const isSelf = member.clientId === clientId;
              return (
                <motion.div
                  key={member.clientId}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: isSelf ? 1.15 : 1 }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  title={member.playerName}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    background: isSelf ? "var(--color-primary)" : "var(--color-bg-card)",
                    color: isSelf ? "var(--color-bg)" : "var(--color-text-muted)",
                    border: `1px solid ${isSelf ? "var(--color-primary)" : "var(--color-border)"}`,
                    zIndex: isSelf ? 1 : 0,
                  }}
                >
                  {index === 0 && !isSelf ? "▶" : initials(member.playerName)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button
          onClick={onLeave}
          style={{
            marginTop: 20,
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: "0.8rem",
            padding: "8px 16px",
            opacity: 0.6,
          }}
        >
          Leave the line
        </button>
      </motion.div>
    </div>
  );
}
