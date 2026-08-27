import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { router } from "./routes.js";
import { addClient, removeClient } from "./events.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // Respected by nginx and several corporate proxies; without it an
    // intermediary may buffer the stream, and the browser then never sees
    // the response headers, so EventSource is stuck on CONNECTING forever.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  // Proxies that buffer by size rather than by header still hold the stream
  // until enough bytes arrive. This padding comment pushes the response past
  // the usual thresholds straight away so the client can open the stream.
  res.write(`:${" ".repeat(2048)}\n\n`);
  res.write("retry: 3000\n\n");

  addClient(res);
  req.on("close", () => removeClient(res));
});

app.use("/api", router);
app.use(express.static(DIST_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`leanerp-sd-quiz server listening on :${PORT}`);
});
