// node --test server/queue.test.js
import test from "node:test";
import assert from "node:assert/strict";

// Each scenario needs its own module instance: the queue is deliberately
// process-global state.
async function loadQueue() {
  const queue = await import(`./queue.js?case=${Math.random()}`);
  return { queue };
}

/**
 * Records the order of frames written to the stream. queue.js caches its own
 * import of events.js, so attach to that same instance.
 */
async function captureFrames() {
  const events = await import("./events.js");
  const frames = [];
  const client = { write: (payload) => frames.push(payload) };
  events.addClient(client);
  return {
    names: () => frames.map((f) => /event: (\w+)/.exec(f)?.[1]).filter(Boolean),
    stop: () => events.removeClient(client),
  };
}

test("kick frees the slot and promotes the next player", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");
  queue.join("b", "Bob");
  queue.join("c", "Cas");

  const after = queue.kick("a");
  assert.equal(after.removed, true);
  assert.equal(after.active, null);
  assert.equal(after.ready.clientId, "b");
  assert.equal(after.waiting.length, 1);
  assert.equal(queue.getState("a").state, "idle");
});

test("kicking someone who is not queued changes nothing", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");
  const after = queue.kick("nobody");
  assert.equal(after.removed, false);
  assert.equal(after.active.clientId, "a");
});

test("a kicked player stops being mirrored until they start again", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");

  assert.equal(queue.isMirrorSilenced("a"), false);
  queue.kick("a");
  assert.equal(queue.isMirrorSilenced("a"), true, "a kicked run must not reach the presentation");

  // Starting a new run is not a ban being lifted by hand — it just ends.
  queue.join("a", "Ann");
  assert.equal(queue.isMirrorSilenced("a"), false);
});

test("claiming a turn also clears the silence", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");
  queue.join("b", "Bob");
  queue.kick("b");
  assert.equal(queue.isMirrorSilenced("b"), true);

  queue.join("b", "Bob");
  queue.kick("a"); // frees the slot, promoting b to "ready"
  queue.claim("b");
  assert.equal(queue.isMirrorSilenced("b"), false);
});

test("a stopped run is reported on the next queue reply, not only live", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");

  const stopped = queue.stopPlayer("a");
  assert.equal(stopped.stopped, true);
  // This is the path a tablet takes when it missed the live event.
  assert.equal(queue.heartbeat("a").stopped, true);
  assert.equal(queue.getState("a").stopped, true);

  // ...and it clears as soon as that tablet starts a new run.
  assert.equal(queue.join("a", "Ann").stopped, false);
  assert.equal(queue.heartbeat("a").stopped, false);
});

test("kick does not tell the tablet to end its run", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");
  queue.kick("a");
  assert.equal(queue.heartbeat("a").stopped, false, "kick frees the slot; the run continues");
});

test("stopping an unknown client leaves other tablets alone", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");
  const result = queue.stopPlayer("ghost");
  assert.equal(result.stopped, false);
  assert.equal(result.active.clientId, "a");
  assert.equal(queue.heartbeat("a").stopped, false);
});

test("clearing empties the queue", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");
  queue.join("b", "Bob");

  const cleared = queue.clearAll();
  assert.equal(cleared.cleared, true);
  assert.equal(cleared.active, null);
  assert.equal(cleared.ready, null);
  assert.deepEqual(cleared.waiting, []);
  assert.equal(queue.clearAll().cleared, false);
});

test("one player at a time: the second join waits", async () => {
  const { queue } = await loadQueue();
  assert.equal(queue.join("a", "Ann").state, "active");
  const second = queue.join("b", "Bob");
  assert.equal(second.state, "waiting");
  assert.equal(second.position, 1);

  queue.leave("a");
  assert.equal(queue.getState("b").state, "ready");
  assert.equal(queue.claim("b").state, "active");
});

test("the frame that ends a run is sent before the one that frees the slot", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");

  const frames = await captureFrames();
  queue.stopPlayer("a");
  const names = frames.names();
  frames.stop();

  const stoppedAt = names.indexOf("player_stopped");
  const queueAt = names.indexOf("queue_state");
  assert.ok(stoppedAt >= 0, `expected a player_stopped frame, got ${names.join(", ")}`);
  assert.ok(queueAt >= 0, `expected a queue_state frame, got ${names.join(", ")}`);
  // A connection dying between the two must not be able to swallow the frame
  // that tells the tablet to stop playing.
  assert.ok(
    stoppedAt < queueAt,
    `player_stopped must precede queue_state, got ${names.join(", ")}`
  );
});

test("a kick sends no player_stopped, so the run carries on", async () => {
  const { queue } = await loadQueue();
  queue.join("a", "Ann");

  const frames = await captureFrames();
  queue.kick("a");
  const names = frames.names();
  frames.stop();

  assert.ok(!names.includes("player_stopped"), `kick must not end the run, got ${names.join(", ")}`);
  assert.ok(names.includes("mirror_stop"), "the presentation still has to drop them");
});
