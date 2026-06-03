import { Router } from "express";
import { analyzeReplay } from "../controllers/analysis.controller.js";

const router = Router();

router.get("/analyze", analyzeReplay);

export default router;
