import { getOverviewData, getMovementData, getPositioningData } from "../services/stats.service.js";
import { getAggregatedStats } from "../services/aggregated-stats.service.js";

export async function getOverview(req, res, next) {
  try {
    const data = await getOverviewData({ replayId: req.query.replayId ?? null });
    if (!data) {
      return res.status(404).json({ error: "No replay data found. Upload a replay to get started." });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getPositioning(req, res, next) {
  try {
    const data = await getPositioningData({ replayId: req.query.replayId ?? null });
    if (!data) {
      return res.status(404).json({ error: "No replay data found. Upload a replay to get started." });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getMovement(req, res, next) {
  try {
    const data = await getMovementData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No replay data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getAggregate(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const data = await getAggregatedStats({
      dateFrom: dateFrom ?? null,
      dateTo:   dateTo   ?? null,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
