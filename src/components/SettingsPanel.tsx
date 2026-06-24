import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../hooks/useSettings";
import { scoreStorage } from "../storage";
import type { ScoreRecord } from "../types";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaderboard: () => void;
  onHome: () => void;
}

export function SettingsPanel({ isOpen, onClose, onLeaderboard, onHome }: SettingsPanelProps) {
  const { settings, setSoundEnabled } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 3000);
  };

  const handleExport = async () => {
    const scores = await scoreStorage.exportScores();
    const blob = new Blob([JSON.stringify(scores, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash(`Exported ${scores.length} records`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: ScoreRecord[] = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("bad format");
      await scoreStorage.importScores(data);
      flash(`Imported ${data.length} records`);
    } catch {
      flash("Invalid JSON file");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClear = async () => {
    if (window.confirm("Clear all leaderboard data? This cannot be undone.")) {
      await scoreStorage.clearScores();
      onClose();
      onHome();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: 56,
              right: 20,
              width: 300,
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 24,
              zIndex: 201,
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            }}
          >
            <h3
              style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 20 }}
            >
              Settings
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>Sound effects</span>
              <button
                onClick={() => setSoundEnabled(!settings.soundEnabled)}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  background: settings.soundEnabled
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: settings.soundEnabled ? 21 : 3,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--color-text-muted)",
                  marginBottom: 12,
                }}
              >
                Leaderboard
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <button
                  className="btn-secondary"
                  onClick={() => { onLeaderboard(); onClose(); }}
                  style={{
                    padding: "10px 16px",
                    minHeight: "auto",
                    fontSize: "0.85rem",
                  }}
                >
                  View Leaderboard
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleExport}
                  style={{
                    padding: "10px 16px",
                    minHeight: "auto",
                    fontSize: "0.85rem",
                  }}
                >
                  Export JSON
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: "10px 16px",
                    minHeight: "auto",
                    fontSize: "0.85rem",
                  }}
                >
                  Import JSON
                </button>
                <button
                  className="btn-danger"
                  onClick={handleClear}
                  style={{ padding: "10px 16px", fontSize: "0.85rem" }}
                >
                  Clear Leaderboard
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: "none" }}
              />

              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 12,
                    fontSize: "0.8rem",
                    color: "var(--color-primary)",
                    textAlign: "center",
                  }}
                >
                  {status}
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
