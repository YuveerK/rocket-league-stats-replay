import {
  getBoostTeamData,
  getBoostPlayersData,
  getBoostPickupsData,
} from "../services/boost.service.js";

export async function getBoostTeam(_req, res, next) {
  try {
    const data = await getBoostTeamData();
    if (!data) return res.status(404).json({ error: "No boost data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getBoostPlayers(_req, res, next) {
  try {
    const data = await getBoostPlayersData();
    if (!data) return res.status(404).json({ error: "No boost data found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getBoostPickups(_req, res, next) {
  try {
    const data = await getBoostPickupsData();
    if (!data) return res.status(404).json({ error: "No pickup data found. Analyse a replay first." });
    res.json(data);
  } catch (error) {
    next(error);
  }
}
