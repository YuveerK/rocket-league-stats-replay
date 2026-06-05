import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { OUTPUT_DIR } from "../config/paths.js";
import { getHeatmapData } from "../services/heatmap.service.js";

export async function serveHeatmapImage(req, res) {
  const filePath = path.join(OUTPUT_DIR, "heatmaps", path.basename(req.params.filename));
  try {
    await stat(filePath);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=60");
    createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ error: "Image not found" });
  }
}

export async function getHeatmapDataHandler(req, res, next) {
  try {
    const data = await getHeatmapData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No position data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
