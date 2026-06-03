import { getOverviewData, getMovementData } from "../services/stats.service.js";

export async function getOverview(_req, res, next) {
  try {
    const data = await getOverviewData();
    if (!data) {
      return res.status(404).json({ error: "No replay data found. Upload a replay to get started." });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getMovement(_req, res, next) {
  try {
    const data = await getMovementData();
    if (!data) return res.status(404).json({ error: "No replay data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
