import { Router } from "express";
import { serveHeatmapImage, getHeatmapDataHandler } from "../controllers/heatmap.controller.js";

const router = Router();

router.get("/heatmaps/:filename", serveHeatmapImage);
router.get("/api/heatmap-data", getHeatmapDataHandler);

export default router;
