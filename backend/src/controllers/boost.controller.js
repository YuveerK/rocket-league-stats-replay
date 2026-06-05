import {
  getBoostTeamData,
  getBoostPlayersData,
  getBoostPickupsData,
} from "../services/boost.service.js";

export async function getBoostTeam(req, res, next) {
  try {
    const data = await getBoostTeamData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No boost data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getBoostPlayers(req, res, next) {
  try {
    const data = await getBoostPlayersData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No boost data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getBoostPickups(req, res, next) {
  try {
    const data = await getBoostPickupsData({ replayId: req.query.replayId ?? null });
    if (!data) return res.status(404).json({ error: "No pickup data found. Analyse a replay first." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
