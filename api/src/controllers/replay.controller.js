import { buildReplayLibrary, setActiveReplay } from "../services/replay.service.js";

export async function listReplays(req, res, next) {
  try {
    res.json(await buildReplayLibrary());
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
