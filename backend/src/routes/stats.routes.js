import { Router } from "express";
import { getOverview, getMovement, getPositioning } from "../controllers/stats.controller.js";

const router = Router();

router.get("/overview", getOverview);
router.get("/positioning", getPositioning);
router.get("/movement", getMovement);

export default router;
