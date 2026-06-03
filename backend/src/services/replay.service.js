import fs from "node:fs/promises";
import { readOutput, readJsonFile } from "../repositories/output.repository.js";
import { getReplayFiles, parseReplayHeader } from "../repositories/replay.repository.js";
import { OUTPUT_DIR, REPLAY_LIBRARY_PATH, REPLAY_LIBRARY_DIR } from "../config/paths.js";
import { toNumber, cleanPlatform, cleanMapName } from "../utils/format.js";

function summarizePlayers(players = []) {
  return players.map((player) => ({
    name: player.Name ?? "Unknown",
    team: player.Team ?? null,
    platform: cleanPlatform(player.Platform),
    score: player.Score ?? 0,
    goals: player.Goals ?? 0,
    assists: player.Assists ?? 0,
    saves: player.Saves ?? 0,
    shots: player.Shots ?? 0,
    bot: Boolean(player.bBot),
  }));
}

function buildReplaySummary(parsedReplay, fileInfo, processedNames, activeReplayId) {
  const properties = parsedReplay?.properties ?? {};
  const players = summarizePlayers(properties.PlayerStats ?? []);
  const replayId = properties.Id ?? null;
  const team0Score =
    properties.Team0Score ??
    players.filter((p) => p.team === 0).reduce((sum, p) => sum + p.goals, 0);
  const team1Score =
    properties.Team1Score ??
    players.filter((p) => p.team === 1).reduce((sum, p) => sum + p.goals, 0);
  const totalSecondsPlayed = toNumber(properties.TotalSecondsPlayed);
  const matchStartEpoch = toNumber(properties.MatchStartEpoch);
  const winningTeam =
    properties.WinningTeam ??
    (team0Score === team1Score ? null : team0Score > team1Score ? 0 : 1);
  const goals = Array.isArray(properties.Goals)
    ? properties.Goals.map((goal) => ({
        frame: goal.frame ?? null,
        playerName: goal.PlayerName ?? "Unknown",
        team: goal.PlayerTeam ?? null,
      }))
    : [];

  return {
    fileName: fileInfo.fileName,
    replayPath: fileInfo.replayPath,
    size: fileInfo.size,
    modifiedAt: fileInfo.modifiedAt,
    replayId,
    replayName: properties.ReplayName ?? null,
    mapName: properties.MapName ?? null,
    mapDisplayName: cleanMapName(properties.MapName),
    date: properties.Date ?? null,
    matchStartEpoch,
    matchType: properties.MatchType ?? null,
    teamSize: properties.TeamSize ?? null,
    unfairTeamSize: properties.UnfairTeamSize ?? null,
    primaryPlayerName: properties.PlayerName ?? null,
    primaryPlayerTeam: properties.PrimaryPlayerTeam ?? null,
    totalSecondsPlayed,
    overtime: totalSecondsPlayed !== null ? totalSecondsPlayed > 305 : false,
    forfeit: properties.bForfeit === true,
    team0Score,
    team1Score,
    winningTeam,
    goalCount: goals.length,
    goals,
    players,
    analyzed: processedNames.has(fileInfo.fileName),
    current: replayId !== null && replayId === activeReplayId,
  };
}

export async function buildReplayLibrary({ refresh = false } = {}) {
  const [files, cache, processedReplays, finalStats] = await Promise.all([
    getReplayFiles(),
    readJsonFile(REPLAY_LIBRARY_PATH, { entries: {} }),
    readOutput("processed-replays.json").catch(() => []),
    readOutput("final-player-stats.json").catch(() => null),
  ]);

  const processedNames = new Set(Array.isArray(processedReplays) ? processedReplays : []);
  const activeReplayId = finalStats?.replayId ?? null;
  const cachedEntries = cache?.entries ?? {};
  const nextCache = {};
  const replays = [];

  for (const file of files) {
    const cached = cachedEntries[file.fileName];
    const cacheHit =
      !refresh &&
      cached &&
      cached.size === file.size &&
      cached.mtimeMs === file.mtimeMs;

    if (cacheHit) {
      const replay = {
        ...cached.summary,
        replayPath: file.replayPath,
        modifiedAt: file.modifiedAt,
        analyzed: processedNames.has(file.fileName),
        current: cached.summary.replayId !== null && cached.summary.replayId === activeReplayId,
      };
      nextCache[file.fileName] = { ...cached, summary: replay };
      replays.push(replay);
      continue;
    }

    try {
      const parsedReplay = await parseReplayHeader(file.replayPath);
      const summary = buildReplaySummary(parsedReplay, file, processedNames, activeReplayId);
      nextCache[file.fileName] = {
        size: file.size,
        mtimeMs: file.mtimeMs,
        indexedAt: new Date().toISOString(),
        summary,
      };
      replays.push(summary);
    } catch (error) {
      const summary = {
        fileName: file.fileName,
        replayPath: file.replayPath,
        size: file.size,
        modifiedAt: file.modifiedAt,
        analyzed: processedNames.has(file.fileName),
        current: false,
        parseError: error.message,
        players: [],
        goals: [],
      };
      nextCache[file.fileName] = {
        size: file.size,
        mtimeMs: file.mtimeMs,
        indexedAt: new Date().toISOString(),
        summary,
      };
      replays.push(summary);
    }
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(
    REPLAY_LIBRARY_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), entries: nextCache }, null, 2),
    "utf8",
  );

  const sortTime = (replay) => {
    if (typeof replay.matchStartEpoch === "number") return replay.matchStartEpoch;
    const parsed = Date.parse(replay.modifiedAt ?? "");
    return Number.isFinite(parsed) ? parsed / 1000 : 0;
  };

  replays.sort((a, b) => sortTime(b) - sortTime(a));

  return {
    generatedAt: new Date().toISOString(),
    sourceDir: REPLAY_LIBRARY_DIR,
    replays,
    summary: {
      total: replays.length,
      analyzed: replays.filter((r) => r.analyzed).length,
      overtime: replays.filter((r) => r.overtime).length,
      forfeits: replays.filter((r) => r.forfeit).length,
      maps: new Set(replays.map((r) => r.mapName).filter(Boolean)).size,
    },
  };
}
