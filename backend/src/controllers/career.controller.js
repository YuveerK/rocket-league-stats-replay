import { getAllPlayers, getCareerStats, getPeerBreakdown, getPlayerCompare } from "../services/career.service.js";

export async function listPlayers(_req, res, next) {
  try {
    res.json(await getAllPlayers());
  } catch (err) {
    next(err);
  }
}

export async function careerStats(req, res, next) {
  try {
    const playerName = req.query.player;
    if (!playerName) return res.status(400).json({ error: "player query param required" });

    const data = await getCareerStats(playerName);
    if (!data) return res.status(404).json({ error: `No replays found for player "${playerName}"` });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function peerBreakdown(req, res, next) {
  try {
    const playerName = req.query.player;
    if (!playerName) return res.status(400).json({ error: "player query param required" });

    const data = await getPeerBreakdown(playerName);
    if (!data) return res.status(404).json({ error: `No replays found for player "${playerName}"` });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function playerCompare(req, res, next) {
  try {
    const playerA = req.query.playerA;
    const playerB = req.query.playerB;

    if (!playerA || !playerB) {
      return res.status(400).json({ error: "playerA and playerB query params are required" });
    }

    const data = await getPlayerCompare(playerA, playerB);
    if (!data) return res.status(404).json({ error: "No replays found for one or both selected players" });

    res.json(data);
  } catch (err) {
    next(err);
  }
}
