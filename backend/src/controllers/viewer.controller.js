import { getWatchData } from "../services/viewer.service.js";

export async function getWatchDataHandler(req, res, next) {
  try {
    const data = await getWatchData({ replayId: req.query.replayId ?? null });
    if (!data) {
      return res.status(404).json({
        error: "No replay position data found. Analyse a replay before opening the viewer.",
      });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}
