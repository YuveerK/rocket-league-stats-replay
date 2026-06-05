import { prisma } from "../../lib/prisma.js";
import { activateReplay as activateReplayRecord, resolveReplay } from "../repositories/artifact.repository.js";
import { cleanMapName } from "../utils/format.js";

function toNumber(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapReplayPlayer(matchPlayer) {
  const player = matchPlayer.player;
  return {
    name: player.playerName,
    team: matchPlayer.team,
    platform: player.platform,
    score: matchPlayer.score ?? 0,
    goals: matchPlayer.goals ?? 0,
    assists: matchPlayer.assists ?? 0,
    saves: matchPlayer.saves ?? 0,
    shots: matchPlayer.shots ?? 0,
    bot: Boolean(player.isBot),
  };
}

function resultWinningTeam(replay) {
  if (replay.winningTeam != null) return replay.winningTeam;
  if (replay.team0Score === replay.team1Score) return null;
  return replay.team0Score > replay.team1Score ? 0 : 1;
}

function mapReplaySummary(replay, activeReplayId) {
  const players = replay.matchPlayers.map(mapReplayPlayer);
  const goals = replay.timelineEvents
    .filter((event) => event.type === "goal")
    .map((event) => ({
      frame: event.frameIndex ?? null,
      playerName: event.playerName ?? "Unknown",
      team: event.team ?? null,
    }));
  const primaryPlayer = players.find((player) => player.name === replay.recorderName);

  return {
    fileName: replay.fileName,
    size: replay.fileSizeBytes ?? null,
    modifiedAt: replay.uploadedAt?.toISOString() ?? replay.analyzedAt?.toISOString() ?? null,
    replayId: replay.replayId,
    replayName: replay.replayName,
    mapName: replay.mapName,
    mapDisplayName: cleanMapName(replay.mapName),
    date: replay.date,
    matchStartEpoch: toNumber(replay.matchStartEpoch),
    matchType: replay.matchType,
    teamSize: replay.teamSize,
    unfairTeamSize: replay.unfairTeamSize,
    primaryPlayerName: replay.recorderName,
    primaryPlayerTeam: primaryPlayer?.team ?? null,
    totalSecondsPlayed: replay.totalSecondsPlayed,
    overtime: replay.overtime,
    forfeit: replay.forfeit,
    team0Score: replay.team0Score,
    team1Score: replay.team1Score,
    winningTeam: resultWinningTeam(replay),
    goalCount: goals.length,
    goals,
    players,
    analyzed: true,
    current: replay.replayId === activeReplayId,
    analyzedAt: replay.analyzedAt?.toISOString() ?? null,
  };
}

function sortReplayTime(replay) {
  if (typeof replay.matchStartEpoch === "number") return replay.matchStartEpoch;
  const parsedDate = Date.parse(String(replay.date ?? "").replace(/(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})/, "$1T$2:$3:$4"));
  if (Number.isFinite(parsedDate)) return parsedDate / 1000;
  const parsedModified = Date.parse(replay.modifiedAt ?? "");
  return Number.isFinite(parsedModified) ? parsedModified / 1000 : 0;
}

export async function buildReplayLibrary() {
  const [activeReplay, replays] = await Promise.all([
    resolveReplay(),
    prisma.replay.findMany({
      where: { analyzedAt: { not: null } },
      include: {
        matchPlayers: {
          include: {
            player: {
              select: {
                playerName: true,
                platform: true,
                isBot: true,
              },
            },
          },
          orderBy: [{ team: "asc" }, { score: "desc" }],
        },
        timelineEvents: {
          where: { type: "goal" },
          orderBy: { frameIndex: "asc" },
        },
      },
      orderBy: { analyzedAt: "desc" },
    }),
  ]);

  const summaries = replays
    .map((replay) => mapReplaySummary(replay, activeReplay?.replayId ?? null))
    .sort((a, b) => sortReplayTime(b) - sortReplayTime(a));

  return {
    generatedAt: new Date().toISOString(),
    replays: summaries,
    summary: {
      total: summaries.length,
      analyzed: summaries.length,
      overtime: summaries.filter((r) => r.overtime).length,
      forfeits: summaries.filter((r) => r.forfeit).length,
      maps: new Set(summaries.map((r) => r.mapName).filter(Boolean)).size,
    },
  };
}

export async function setActiveReplay(replayId) {
  return activateReplayRecord(replayId);
}
