const apiBase = `${import.meta.env.BASE_URL}api`;

export function syncPresentation(payload: Record<string, unknown>): void {
  try {
    fetch(`${apiBase}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // best-effort — presentation mirroring must never block the quiz
    });
  } catch {
    // ignore
  }
}
