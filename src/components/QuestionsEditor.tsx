import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question } from "../types";
import { questionStorage, questionSource } from "../storage/QuestionStorage";

interface Props {
  onBack: () => void;
}

const emptyForm = (): Question => ({
  id: crypto.randomUUID(),
  category: "",
  question: "",
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
    { id: "c", text: "" },
  ],
  correctOptionId: "a",
  explanation: "",
});

const OPTION_IDS = ["a", "b", "c", "d"] as const;

export function QuestionsEditor({ onBack }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const flash = (msg: string, ok = true) => {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = await questionStorage.getQuestions();
      setQuestions(qs);
    } catch {
      flash("Failed to load questions", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (q: Question) => {
    setEditingQuestion({ ...q, options: q.options.map(o => ({ ...o })) });
  };

  const handleAdd = () => {
    setEditingQuestion(emptyForm());
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await questionStorage.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      flash("Question deleted");
    } catch {
      flash("Failed to delete — Supabase may be unavailable", false);
    }
  };

  const handleSave = async () => {
    if (!editingQuestion) return;
    const q = editingQuestion;
    if (!q.question.trim()) { flash("Question text is required", false); return; }
    if (q.options.some(o => !o.text.trim())) { flash("All options must have text", false); return; }
    if (!q.options.find(o => o.id === q.correctOptionId)) { flash("Select a correct option", false); return; }

    setSaving(true);
    try {
      await questionStorage.saveQuestion(q);
      setQuestions(prev => {
        const idx = prev.findIndex(x => x.id === q.id);
        return idx >= 0 ? prev.map(x => x.id === q.id ? q : x) : [...prev, q];
      });
      setEditingQuestion(null);
      flash("Saved to Supabase");
    } catch {
      flash("Failed to save — Supabase may be unavailable", false);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm(`Upload all ${questions.length} questions to Supabase?`)) return;
    setSyncing(true);
    let ok = 0;
    for (const q of questions) {
      try { await questionStorage.saveQuestion(q); ok++; } catch { /* skip */ }
    }
    setSyncing(false);
    flash(`Synced ${ok}/${questions.length} questions to Supabase`);
  };

  const updateOption = (idx: number, text: string) => {
    setEditingQuestion(prev => {
      if (!prev) return prev;
      const options = prev.options.map((o, i) => i === idx ? { ...o, text } : o);
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setEditingQuestion(prev => {
      if (!prev || prev.options.length >= 4) return prev;
      const nextId = OPTION_IDS[prev.options.length];
      return { ...prev, options: [...prev.options, { id: nextId, text: "" }] };
    });
  };

  const removeOption = (idx: number) => {
    setEditingQuestion(prev => {
      if (!prev || prev.options.length <= 2) return prev;
      const options = prev.options.filter((_, i) => i !== idx);
      const correctOptionId = options.find(o => o.id === prev.correctOptionId)
        ? prev.correctOptionId
        : options[0].id;
      return { ...prev, options, correctOptionId };
    });
  };

  const cell: React.CSSProperties = {
    background: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  };

  const input: React.CSSProperties = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    color: "var(--color-text)",
    fontSize: "0.9rem",
    padding: "10px 12px",
    width: "100%",
  };

  return (
    <div className="app-container" style={{ justifyContent: "flex-start", paddingTop: 24 }}>
      <div className="screen-card" style={{ padding: "28px 32px", width: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              Questions Editor
            </h2>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
              Source:{" "}
              <span style={{ color: questionSource === "supabase" ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                {questionSource === "supabase" ? "Supabase" : questionSource === "local" ? "local JSON" : "loading…"}
              </span>
              {" · "}{questions.length} questions
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {questionSource === "local" && !loading && (
              <button
                className="btn-secondary"
                onClick={handleSyncAll}
                disabled={syncing}
                style={{ padding: "8px 14px", minHeight: "auto", fontSize: "0.8rem" }}
              >
                {syncing ? "Syncing…" : "Upload to Supabase"}
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={handleAdd}
              style={{ padding: "8px 14px", minHeight: "auto", fontSize: "0.85rem" }}
            >
              + Add
            </button>
            <button
              className="btn-secondary"
              onClick={onBack}
              style={{ padding: "8px 14px", minHeight: "auto", fontSize: "0.85rem" }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Status */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: "0.85rem",
                background: status.ok ? "rgba(109,255,163,0.1)" : "rgba(255,77,106,0.1)",
                color: status.ok ? "var(--color-primary)" : "var(--color-error)",
                border: `1px solid ${status.ok ? "var(--color-primary-dark)" : "rgba(255,77,106,0.3)"}`,
              }}
            >
              {status.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {questions.map((q, i) => (
              <div key={q.id} style={cell}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-primary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                    {q.category || "—"}
                  </div>
                  <div style={{ fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {i + 1}. {q.question}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleEdit(q)}
                    style={{ padding: "6px 12px", borderRadius: 6, background: "var(--color-border)", color: "var(--color-text)", fontSize: "0.8rem" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255,77,106,0.1)", color: "var(--color-error)", fontSize: "0.8rem" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                No questions yet — click "+ Add" to create one.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit/Add form modal */}
      <AnimatePresence>
        {editingQuestion && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingQuestion(null)}
              onKeyDown={(e) => e.key === "Escape" && setEditingQuestion(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(640px, 95vw)",
                maxHeight: "90dvh",
                overflowY: "auto",
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: 28,
                zIndex: 301,
              }}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 20 }}>
                {questions.find(q => q.id === editingQuestion.id) ? "Edit Question" : "New Question"}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>Category</label>
                  <input style={input} value={editingQuestion.category} onChange={e => setEditingQuestion(prev => prev ? { ...prev, category: e.target.value } : prev)} placeholder="e.g. Warehouse Management" />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>Question</label>
                  <textarea
                    style={{ ...input, minHeight: 80, resize: "vertical" }}
                    value={editingQuestion.question}
                    onChange={e => setEditingQuestion(prev => prev ? { ...prev, question: e.target.value } : prev)}
                    placeholder="Enter the question text"
                  />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Options — select correct one</label>
                    {editingQuestion.options.length < 4 && (
                      <button onClick={addOption} style={{ fontSize: "0.75rem", color: "var(--color-primary)", background: "none" }}>+ Add option</button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {editingQuestion.options.map((opt, idx) => (
                      <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="radio"
                          name="correct"
                          checked={editingQuestion.correctOptionId === opt.id}
                          onChange={() => setEditingQuestion(prev => prev ? { ...prev, correctOptionId: opt.id } : prev)}
                          style={{ accentColor: "var(--color-primary)", width: 16, height: 16, flexShrink: 0 }}
                        />
                        <input
                          style={{ ...input, flex: 1 }}
                          value={opt.text}
                          onChange={e => updateOption(idx, e.target.value)}
                          placeholder={`Option ${opt.id.toUpperCase()}`}
                        />
                        {editingQuestion.options.length > 2 && (
                          <button
                            onClick={() => removeOption(idx)}
                            style={{ color: "var(--color-error)", background: "none", fontSize: "1rem", padding: "0 4px", flexShrink: 0 }}
                          >×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>Explanation</label>
                  <textarea
                    style={{ ...input, minHeight: 64, resize: "vertical" }}
                    value={editingQuestion.explanation}
                    onChange={e => setEditingQuestion(prev => prev ? { ...prev, explanation: e.target.value } : prev)}
                    placeholder="Shown after answering"
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setEditingQuestion(null)}
                    style={{ padding: "10px 20px", minHeight: "auto", fontSize: "0.9rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: "10px 24px", minHeight: "auto", fontSize: "0.9rem", width: "auto" }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
