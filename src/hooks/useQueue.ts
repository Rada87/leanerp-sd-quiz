import { useCallback, useEffect, useRef, useState } from "react";
import { getClientId } from "../utils/clientId";

const apiBase = `${import.meta.env.BASE_URL}api`;
const HEARTBEAT_MS = 15000; // comfortably under the server's 60 s timeouts

export type QueueState = "idle" | "waiting" | "ready" | "active";

export interface QueueMember {
  clientId: string;
  playerName: string;
}

export interface QueueSnapshot {
  state: QueueState;
  position: number;
  active: QueueMember | null;
  ready: QueueMember | null;
  waiting: QueueMember[];
  waitingCount: number;
}

const emptySnapshot: QueueSnapshot = {
  state: "idle",
  position: 0,
  active: null,
  ready: null,
  waiting: [],
  waitingCount: 0,
};

async function post(path: string, body: Record<string, unknown>): Promise<QueueSnapshot | null> {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as QueueSnapshot;
  } catch {
    return null;
  }
}

/**
 * Client half of the single-player gate. Every call degrades to null when the
 * server is unreachable, and callers treat that as "just let them play" —
 * a queue outage must never lock players out of the quiz.
 */
export function useQueue() {
  const clientId = useRef(getClientId()).current;
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(emptySnapshot);
  const stateRef = useRef<QueueState>("idle");

  stateRef.current = snapshot.state;

  const apply = useCallback((next: QueueSnapshot | null) => {
    if (next) setSnapshot(next);
    return next;
  }, []);

  const join = useCallback(
    (playerName: string) => post("/queue/join", { clientId, playerName }).then(apply),
    [clientId, apply]
  );

  const claim = useCallback(
    () => post("/queue/claim", { clientId }).then(apply),
    [clientId, apply]
  );

  const leave = useCallback(() => {
    if (stateRef.current === "idle") return Promise.resolve(null);
    stateRef.current = "idle";
    setSnapshot(emptySnapshot);
    return post("/queue/leave", { clientId });
  }, [clientId]);

  // Live position updates ride the same SSE stream the presentation uses.
  useEffect(() => {
    const source = new EventSource(`${apiBase}/events`);
    const onQueueState = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setSnapshot((prev) => {
          if (prev.state === "idle") return prev; // not in line — ignore
          const index = data.waiting.findIndex((w: QueueMember) => w.clientId === clientId);
          const state: QueueState =
            data.active?.clientId === clientId
              ? "active"
              : data.ready?.clientId === clientId
                ? "ready"
                : index >= 0
                  ? "waiting"
                  : "idle";
          return { ...data, state, position: index >= 0 ? index + 1 : 0 };
        });
      } catch {
        // ignore malformed frames
      }
    };
    source.addEventListener("queue_state", onQueueState as EventListener);
    return () => {
      source.removeEventListener("queue_state", onQueueState as EventListener);
      source.close();
    };
  }, [clientId]);

  // Keep our slot alive while we hold one.
  useEffect(() => {
    const timer = setInterval(() => {
      if (stateRef.current === "idle") return;
      post("/queue/heartbeat", { clientId }).then((next) => {
        if (next) setSnapshot((prev) => (prev.state === "idle" ? prev : next));
      });
    }, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [clientId]);

  // Free the slot if the tablet is closed mid-quiz.
  useEffect(() => {
    const release = () => {
      if (stateRef.current === "idle") return;
      navigator.sendBeacon?.(
        `${apiBase}/queue/leave`,
        new Blob([JSON.stringify({ clientId })], { type: "application/json" })
      );
    };
    window.addEventListener("pagehide", release);
    return () => window.removeEventListener("pagehide", release);
  }, [clientId]);

  return { snapshot, join, claim, leave };
}
