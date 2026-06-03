import { Router } from "express";
import { getOverview, getMovement } from "../controllers/stats.controller.js";

const router = Router();

router.get("/overview", getOverview);
router.get("/movement", getMovement);

export default router;
