import { Router } from "express";
import { activateReplay, listReplays } from "../controllers/replay.controller.js";

const router = Router();

router.get("/replays", listReplays);
router.post("/replays/:replayId/activate", activateReplay);

export default router;
