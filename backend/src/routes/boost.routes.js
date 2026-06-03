import { Router } from "express";
import { getBoostTeam, getBoostPlayers, getBoostPickups } from "../controllers/boost.controller.js";

const router = Router();

router.get("/boost-team", getBoostTeam);
router.get("/boost-players", getBoostPlayers);
router.get("/boost-pickups", getBoostPickups);

export default router;
