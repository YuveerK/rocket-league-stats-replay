import { getHeatmapData } from "../services/heatmap.service.js";

export async function getHeatmapDataHandler(req, res, next) {
  try {
    const data = await getHeatmapData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No position data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
