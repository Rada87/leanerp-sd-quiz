import { useState } from "react";
import { motion } from "framer-motion";

interface StartScreenProps {
  onStart: (playerName: string) => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [name, setName] = useState("");

  const handleStart = () => {
    onStart(name.trim() || "Guest");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleStart();
  };

  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <motion.div
        className="screen-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ textAlign: "center", maxWidth: 600, margin: "0 auto" }}
      >
        {/* CSS Robot Mascot */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ marginBottom: 24 }}
        >
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 6,
                height: 16,
                background: "var(--color-primary)",
                borderRadius: 3,
              }}
            />
            <div
              style={{
                width: 64,
                height: 48,
                background: "var(--color-bg)",
                border: "2px solid var(--color-primary)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  boxShadow: "0 0 8px var(--color-primary)",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                  boxShadow: "0 0 8px var(--color-primary)",
                }}
              />
            </div>
            <div
              style={{
                width: 48,
                height: 32,
                background: "var(--color-bg)",
                border: "2px solid var(--color-primary-dark)",
                borderRadius: 8,
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--color-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 8,
            }}
          >
            Škoda IT Day 2026 &middot; Explore IT
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 12,
            }}
          >
            LEAN ERP{" "}
            <span style={{ color: "var(--color-primary)" }}>Quiz</span>
          </h1>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "1.1rem",
              marginBottom: 8,
            }}
          >
            Test your SAP & logistics instincts
          </p>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "0.9rem",
              marginBottom: 32,
              opacity: 0.7,
            }}
          >
            Answer fast, score high, and see how close you are to becoming a
            LEAN ERP expert.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your name (optional)"
            maxLength={30}
            style={{
              background: "var(--color-bg)",
              border: "2px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-text)",
              fontSize: "1.1rem",
              padding: "16px 20px",
              textAlign: "center",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--color-primary-dark)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--color-border)")
            }
          />

          <motion.button
            className="btn-primary"
            onClick={handleStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Start Quiz
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{ marginTop: 24, fontSize: "0.75rem", color: "var(--color-text-muted)" }}
        >
          Powered by LEAN ERP Team
        </motion.div>
      </motion.div>
    </div>
  );
}
