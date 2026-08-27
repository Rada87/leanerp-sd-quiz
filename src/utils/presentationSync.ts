const apiBase = `${import.meta.env.BASE_URL}api`;

const LOG = "[quiz-sync]";

export function syncPresentation(payload: Record<string, unknown>): void {
  const url = `${apiBase}/session`;
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) {
          console.log(`${LOG} sent ${payload.type} -> ${res.status}`);
        } else {
          console.warn(`${LOG} POST ${url} rejected with ${res.status}.`);
        }
      })
      // Still best-effort: mirroring must never block the quiz, but a
      // network that silently eats these is worth seeing in the console.
      .catch((error) => {
        console.warn(`${LOG} POST ${url} failed — presentation will not update.`, error);
      });
  } catch (error) {
    console.warn(`${LOG} could not send progress to the presentation.`, error);
  }
}
