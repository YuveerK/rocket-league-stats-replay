import path from "node:path";
import { buildReplayLibrary, setActiveReplay } from "../services/replay.service.js";

export async function uploadReplay(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  res.status(201).json({
    message: "Replay uploaded.",
    replayPath: req.file.path,
    replayName: path.basename(req.file.originalname, ".replay"),
    originalFileName: req.file.originalname,
  });
}

export async function listReplays(req, res, next) {
  try {
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true'
    res.json(await buildReplayLibrary({ refresh }));
  } catch (error) {
    next(error);
  }
}

export async function activateReplay(req, res, next) {
  try {
    const replay = await setActiveReplay(req.params.replayId);
    res.json({ replayId: replay.replayId, activeAt: replay.activeAt });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Replay not found." });
    }
    next(error);
  }
}
