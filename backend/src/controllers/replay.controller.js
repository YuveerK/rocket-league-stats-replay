import { spawn } from "node:child_process";
import path from "node:path";
import { buildReplayLibrary } from "../services/replay.service.js";
import { BACKEND_DIR } from "../config/paths.js";
import { prisma } from "../../lib/prisma.js";

export async function uploadReplay(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const replayId = path.basename(req.file.originalname, ".replay");

  const existing = await prisma.replay.findUnique({ where: { replayId }, select: { replayId: true } });
  if (existing) {
    return res.status(409).json({ message: "Replay already exists in the database.", replayId });
  }

  // Fire-and-forget — spawn pipeline in background, return immediately
  const child = spawn(
    process.execPath,
    [path.join(BACKEND_DIR, "src", "pipeline", "analyzeReplay.js"), req.file.path],
    { cwd: BACKEND_DIR, stdio: "ignore", detached: true },
  );
  child.unref();

  res.status(202).json({ message: "Replay queued for analysis.", replayId });
}

export async function listReplays(req, res, next) {
  try {
    const refresh = req.query.refresh === "1";
    res.json(await buildReplayLibrary({ refresh }));
  } catch (error) {
    next(error);
  }
}
