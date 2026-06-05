import { getBallData } from "../services/ball.service.js";

export async function getBallDataHandler(req, res, next) {
  try {
    const data = await getBallData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No ball data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
