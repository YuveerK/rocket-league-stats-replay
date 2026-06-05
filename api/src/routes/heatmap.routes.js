import { Router } from "express";
import { getHeatmapDataHandler } from "../controllers/heatmap.controller.js";

const router = Router();

router.get("/api/heatmap-data", getHeatmapDataHandler);

export default router;
