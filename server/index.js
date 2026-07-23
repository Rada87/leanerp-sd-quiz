import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { router } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use("/api", router);
app.use(express.static(DIST_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`leanerp-sd-quiz server listening on :${PORT}`);
});
