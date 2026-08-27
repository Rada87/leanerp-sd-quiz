const clients = new Set();

const PING_INTERVAL_MS = 20000;
// Wide enough to push each message past the buffer a corporate proxy may be
// holding it in; such a proxy releases only once its buffer fills, which
// otherwise turns live mirroring into batched, badly delayed updates.
const PAD = " ".repeat(2048);

// Latest state kept so a screen that cannot hold an event stream open can
// poll for the same information instead. Each entry carries the sequence
// number it was published at, which is how a poller tells "new" from
// "already seen" without needing a clock.
// Keep sequence ids increasing across normal process restarts as well. A
// long-lived presentation may retain ids from the previous server instance;
// restarting at zero would make it reject every new event as a duplicate.
// The x1000 headroom allows bursts without approaching Number.MAX_SAFE_INTEGER.
let seq = Date.now() * 1000;
const latest = { seq, progress: null, completed: null, queue: null };

setInterval(() => {
  for (const res of clients) res.write(`:${PAD}\n\n`);
}, PING_INTERVAL_MS).unref();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function broadcast(type, data) {
  seq += 1;
  const entry = { seq, data };
  if (type === "quiz_progress") latest.progress = entry;
  else if (type === "quiz_completed") latest.completed = entry;
  else if (type === "queue_state") latest.queue = entry;
  latest.seq = seq;

  // The trailing comment pads every event past the buffer a proxy may be
  // holding it in. Without it an intermediary accumulates these small
  // messages and releases them late, in a batch, or not at all.
  // The SSE id is the same global sequence exposed by /api/state. The
  // presentation can therefore deduplicate an event that arrives through
  // both SSE and polling during a transport handover.
  const payload = `id: ${entry.seq}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n:${PAD}\n\n`;
  for (const res of clients) res.write(payload);
}

export function getLatest() {
  return latest;
}
