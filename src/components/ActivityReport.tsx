import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { logActivity } from "../utils/activity";

interface ActivityStats {
  phase: string;
  sessions: number;
  quizStarts: number;
  quizCompletions: number;
  completionRate: number;
  queuedSessions: number;
  answers: number;
  correctAnswerRate: number;
  averageScorePercent: number;
  averageDurationSeconds: number;
  errors: number;
}

interface QuestionStats {
  questionId: string;
  category: string;
  answers: number;
  correctRate: number;
  averageResponseSeconds: number;
  choices: Array<{
    optionId: string;
    optionLabel: string;
    count: number;
    percentage: number;
  }>;
}

interface PlayerStats {
  quizRunId: string;
  playerAlias: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: "started" | "completed" | "abandoned";
  scorePercent: number | null;
  answeredCount: number;
  durationSeconds: number | null;
}

interface ActivityError {
  id: string;
  eventName: string;
  receivedAt: string;
  screen: string | null;
  metadata: Record<string, unknown>;
}

interface ActivitySummary {
  generatedAt: string;
  retentionDays: number;
  eventWindow: { startAt: string | null; endAt: string | null };
  totals: ActivityStats;
  phases: ActivityStats[];
  players: PlayerStats[];
  questions: QuestionStats[];
  recentErrors: ActivityError[];
}

interface ActivityReportProps {
  onBack: () => void;
}

const apiBase = `${import.meta.env.BASE_URL}api`;

async function fetchActivitySummary(): Promise<ActivitySummary> {
  const response = await fetch(`${apiBase}/activity/summary`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Activity API returned ${response.status}`);
  return response.json();
}

function Metric({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--color-bg)",
      }}
    >
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-primary)" }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "not configured";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function phaseLabel(phase: string) {
  return ({ before: "Before", during: "During", after: "After", unconfigured: "All data" })[phase] || phase;
}

export function ActivityReport({ onBack }: ActivityReportProps) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [status, setStatus] = useState("Loading activity…");

  const load = useCallback(async () => {
    try {
      setSummary(await fetchActivitySummary());
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load activity report");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchActivitySummary().then((result) => {
      if (cancelled) return;
      setSummary(result);
      setStatus("");
    }).catch((error) => {
      if (cancelled) return;
      setStatus(error instanceof Error ? error.message : "Could not load activity report");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setStatus("Preparing export…");
    try {
      const response = await fetch(`${apiBase}/activity/export?limit=50000`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Activity export returned ${response.status}`);
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quiz-activity-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      logActivity("activity_exported", { count: payload.count || 0 });
      setStatus(`Exported ${payload.count || 0} anonymous events`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not export activity");
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: "flex-start", paddingTop: 36 }}>
      <motion.div
        className="screen-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: "min(100%, 980px)", margin: "0 auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div>
            <div style={{ color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Diagnostics & analytics
            </div>
            <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", marginTop: 6 }}>Activity Report</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.5 }}>
              Players use random aliases. Selected option IDs and labels are stored for question analysis; entered names and answer text are not.
            </p>
          </div>
          <button className="btn-secondary" onClick={onBack} style={{ minHeight: "auto", padding: "10px 16px" }}>
            Back
          </button>
        </div>

        {status && (
          <div style={{ marginTop: 20, color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{status}</div>
        )}

        {summary && (
          <>
            <div style={{ marginTop: 24, padding: "14px 16px", borderRadius: "var(--radius-sm)", background: "rgba(109, 255, 163, 0.06)", border: "1px solid rgba(109, 255, 163, 0.15)", fontSize: "0.82rem", lineHeight: 1.6 }}>
              Event window: <strong>{formatDate(summary.eventWindow.startAt)}</strong> → <strong>{formatDate(summary.eventWindow.endAt)}</strong>
              {!summary.eventWindow.startAt && (
                <span style={{ color: "var(--color-text-muted)" }}> · Set EVENT_START_AT and EVENT_END_AT on the server for before/during/after phases.</span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 20 }}>
              <Metric label="Sessions" value={summary.totals.sessions} />
              <Metric label="Quiz starts" value={summary.totals.quizStarts} />
              <Metric label="Completions" value={summary.totals.quizCompletions} />
              <Metric label="Completion rate" value={summary.totals.completionRate} suffix="%" />
              <Metric label="Average score" value={summary.totals.averageScorePercent} suffix="%" />
              <Metric label="Technical errors" value={summary.totals.errors} />
            </div>

            <section style={{ marginTop: 30 }}>
              <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Event phases</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead style={{ color: "var(--color-text-muted)", textAlign: "left" }}>
                    <tr>
                      {["Phase", "Sessions", "Starts", "Finished", "Rate", "Queued", "Avg. score", "Errors"].map((label) => (
                        <th key={label} style={{ padding: "10px 8px", borderBottom: "1px solid var(--color-border)" }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.phases.map((phase) => (
                      <tr key={phase.phase}>
                        <td style={{ padding: "11px 8px", fontWeight: 700 }}>{phaseLabel(phase.phase)}</td>
                        <td style={{ padding: "11px 8px" }}>{phase.sessions}</td>
                        <td style={{ padding: "11px 8px" }}>{phase.quizStarts}</td>
                        <td style={{ padding: "11px 8px" }}>{phase.quizCompletions}</td>
                        <td style={{ padding: "11px 8px" }}>{phase.completionRate}%</td>
                        <td style={{ padding: "11px 8px" }}>{phase.queuedSessions}</td>
                        <td style={{ padding: "11px 8px" }}>{phase.averageScorePercent}%</td>
                        <td style={{ padding: "11px 8px" }}>{phase.errors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ marginTop: 30 }}>
              <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Recent players</h2>
              {summary.players.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No quiz runs recorded yet.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead style={{ color: "var(--color-text-muted)", textAlign: "left" }}>
                      <tr>
                        {["Player", "Status", "Answers", "Score", "Duration", "Finished"].map((label) => (
                          <th key={label} style={{ padding: "10px 8px", borderBottom: "1px solid var(--color-border)" }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.players.slice(0, 50).map((player) => (
                        <tr key={player.quizRunId}>
                          <td style={{ padding: "11px 8px", fontWeight: 700 }}>{player.playerAlias}</td>
                          <td style={{ padding: "11px 8px" }}>{player.status}</td>
                          <td style={{ padding: "11px 8px" }}>{player.answeredCount}</td>
                          <td style={{ padding: "11px 8px" }}>{player.scorePercent === null ? "—" : `${player.scorePercent}%`}</td>
                          <td style={{ padding: "11px 8px" }}>{player.durationSeconds === null ? "—" : `${player.durationSeconds}s`}</td>
                          <td style={{ padding: "11px 8px" }}>{player.finishedAt ? new Date(player.finishedAt).toLocaleString("en-GB") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={{ marginTop: 30 }}>
              <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Question performance</h2>
              {summary.questions.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No answers recorded yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {summary.questions.map((question) => (
                    <div key={question.questionId} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) repeat(3, auto)", gap: 16, alignItems: "center", padding: "12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem" }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{question.questionId}</strong>
                        <span style={{ color: "var(--color-text-muted)" }}>{question.category}</span>
                      </div>
                      <span>{question.answers} answers</span>
                      <span>{question.correctRate}% correct</span>
                      <span>{question.averageResponseSeconds}s avg.</span>
                      <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 8, color: "var(--color-text-muted)" }}>
                        {question.choices.map((choice) => (
                          <span key={choice.optionId} style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid var(--color-border)" }}>
                            {choice.optionLabel}: {choice.count} ({choice.percentage}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={{ marginTop: 30 }}>
              <h2 style={{ fontSize: "1rem", marginBottom: 12 }}>Recent technical issues</h2>
              {summary.recentErrors.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No technical issues recorded.</p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {summary.recentErrors.map((error) => (
                    <div key={error.id} style={{ padding: "12px", borderLeft: "3px solid var(--color-error)", background: "rgba(255, 77, 106, 0.06)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                      <strong>{error.eventName}</strong> · {new Date(error.receivedAt).toLocaleString("en-GB")} · {error.screen || "unknown screen"}
                      {typeof error.metadata.message === "string" && <div style={{ color: "var(--color-text-muted)" }}>{error.metadata.message}</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 30, paddingTop: 20, borderTop: "1px solid var(--color-border)" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                Retention: {summary.retentionDays} days · Updated {new Date(summary.generatedAt).toLocaleString("en-GB")}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => { setStatus("Loading activity…"); void load(); }} style={{ minHeight: "auto", padding: "10px 16px" }}>Refresh</button>
                <button className="btn-primary" onClick={() => void handleExport()} style={{ minHeight: "auto", padding: "10px 16px" }}>Export anonymous JSON</button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
