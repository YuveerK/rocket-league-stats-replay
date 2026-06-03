import { Router } from "express";
import { listPlayers, careerStats, peerBreakdown, playerCompare } from "../controllers/career.controller.js";

const router = Router();

router.get("/career/players", listPlayers);
router.get("/career/stats", careerStats);
router.get("/career/peers", peerBreakdown);
router.get("/career/compare", playerCompare);

export default router;
