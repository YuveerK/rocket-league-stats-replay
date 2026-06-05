import { Router } from "express";
import { getBallDataHandler } from "../controllers/ball.controller.js";

const router = Router();

router.get("/ball-data", getBallDataHandler);

export default router;
