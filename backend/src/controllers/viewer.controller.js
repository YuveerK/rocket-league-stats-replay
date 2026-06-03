import { getWatchData } from "../services/viewer.service.js";

export async function getWatchDataHandler(_req, res, next) {
  try {
    const data = await getWatchData();
    if (!data) {
      return res.status(404).json({
        error: "No replay position data found. Analyse a replay before opening the viewer.",
      });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}
