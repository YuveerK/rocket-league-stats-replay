import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { activateReplay, uploadReplay, listReplays } from "../controllers/replay.controller.js";

const router = Router();

router.post("/upload", upload.single("replay"), uploadReplay);
router.get("/replays", listReplays);
router.post("/replays/:replayId/activate", activateReplay);

export default router;
