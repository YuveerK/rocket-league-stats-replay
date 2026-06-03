import { getBallData } from "../services/ball.service.js";

export async function getBallDataHandler(_req, res, next) {
  try {
    const data = await getBallData();
    if (!data) return res.status(404).json({ error: "No ball data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
