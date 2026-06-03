import { Router } from "express";
import { getWatchDataHandler } from "../controllers/viewer.controller.js";

const router = Router();

router.get("/watch-data", getWatchDataHandler);

export default router;
