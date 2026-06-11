import { prisma } from "../../lib/prisma.js";

function parseEpoch(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  const date = endOfDay
    ? new Date(`${dateStr}T23:59:59`)
    : new Date(`${dateStr}T00:00:00`);
  const ms = date.getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function parseReplayDate(dateString) {
  if (!dateString) return null;
  const normalized = dateString.replace(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})$/,
    "$1-$2-$3T$4:$5:$6",
  );
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function buildEmptyStats() {
  return {
    gamesPlayed: 0, wins: 0, losses: 0,
    goals: 0, assists: 0, saves: 0, shots: 0, score: 0,
    kills: 0, deaths: 0,
    shootingPctSum: 0,
    boostAvgSum: 0, validBoostGames: 0,
    supersonicPctSum: 0, validSSGames: 0,
    airbornePctSum: 0, validAirGames: 0,
    bpmSum: 0, validBpmGames: 0,
  };
}

function accumulate(bucket, mp, isWin, isLoss) {
  bucket.gamesPlayed++;
  if (isWin) bucket.wins++;
  else if (isLoss) bucket.losses++;
  bucket.goals    += mp.goals    ?? 0;
  bucket.assists  += mp.assists  ?? 0;
  bucket.saves    += mp.saves    ?? 0;
  bucket.shots    += mp.shots    ?? 0;
  bucket.score    += mp.score    ?? 0;
  bucket.kills    += mp.kills    ?? 0;
  bucket.deaths   += mp.deaths   ?? 0;
  bucket.shootingPctSum += mp.shootingPercentage ?? 0;
  if (mp.averageBoost  != null) { bucket.boostAvgSum      += mp.averageBoost;  bucket.validBoostGames++; }
  if (mp.supersonicPct != null) { bucket.supersonicPctSum += mp.supersonicPct; bucket.validSSGames++;    }
  if (mp.airbornePct   != null) { bucket.airbornePctSum   += mp.airbornePct;   bucket.validAirGames++;   }
  if (mp.bpm           != null) { bucket.bpmSum           += mp.bpm;           bucket.validBpmGames++;   }
}

function finalizeStats(b) {
  const gp = b.gamesPlayed;
  return {
    gamesPlayed:  gp,
    wins:         b.wins,
    losses:       b.losses,
    draws:        gp - b.wins - b.losses,
    winRate:      gp ? Math.round((b.wins / gp) * 100) : 0,
    goals:        b.goals,
    assists:      b.assists,
    saves:        b.saves,
    shots:        b.shots,
    score:        b.score,
    kills:        b.kills,
    deaths:       b.deaths,
    avgGoals:     gp ? +(b.goals   / gp).toFixed(2) : 0,
    avgAssists:   gp ? +(b.assists / gp).toFixed(2) : 0,
    avgSaves:     gp ? +(b.saves   / gp).toFixed(2) : 0,
    avgShots:     gp ? +(b.shots   / gp).toFixed(2) : 0,
    avgScore:     gp ? Math.round(b.score / gp)      : 0,
    shootingPct:  gp ? +(b.shootingPctSum  / gp).toFixed(1) : 0,
    avgBoost:     b.validBoostGames ? +(b.boostAvgSum      / b.validBoostGames).toFixed(1) : null,
    supersonicPct: b.validSSGames   ? +(b.supersonicPctSum / b.validSSGames).toFixed(1)    : null,
    airbornePct:  b.validAirGames   ? +(b.airbornePctSum   / b.validAirGames).toFixed(1)   : null,
    bpm:          b.validBpmGames   ? +(b.bpmSum           / b.validBpmGames).toFixed(1)   : null,
  };
}

export async function getAggregatedStats({ dateFrom = null, dateTo = null } = {}) {
  const fromEpoch = parseEpoch(dateFrom, false);
  const toEpoch   = parseEpoch(dateTo, true);

  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { replay: { analyzedAt: { not: null } } },
    include: {
      player: { select: { playerName: true, platform: true, isBot: true } },
      replay: {
        select: {
          replayId: true,
          recorderName: true,
          winningTeam: true,
          team0Score: true,
          team1Score: true,
          matchStartEpoch: true,
          date: true,
          mapName: true,
        },
      },
    },
  });

  // Filter by date range in JS to handle both epoch and date-string replays
  const filtered = matchPlayers.filter((mp) => {
    if (!fromEpoch && !toEpoch) return true;
    const r = mp.replay;
    const epoch =
      r.matchStartEpoch != null
        ? Number(r.matchStartEpoch)
        : parseReplayDate(r.date);
    if (!epoch) return false;
    if (fromEpoch && epoch < fromEpoch) return false;
    if (toEpoch   && epoch > toEpoch)   return false;
    return true;
  });

  if (!filtered.length) {
    return { dateFrom, dateTo, replayCount: 0, primaryPlayer: null, players: [], replays: [] };
  }

  // Build per-replay info and find the recorder's team for each replay
  const replayInfoMap = new Map();
  for (const mp of filtered) {
    const r = mp.replay;
    if (!replayInfoMap.has(r.replayId)) {
      replayInfoMap.set(r.replayId, {
        replayId:      r.replayId,
        recorderName:  r.recorderName,
        recorderTeam:  null,
        winningTeam:   r.winningTeam,
        team0Score:    r.team0Score,
        team1Score:    r.team1Score,
        date:          r.date,
        matchStartEpoch: r.matchStartEpoch != null ? Number(r.matchStartEpoch) : null,
        mapName:       r.mapName,
        teams:         { 0: [], 1: [] },
      });
    }
    const info = replayInfoMap.get(r.replayId);
    info.teams[mp.team]?.push(mp.player.playerName);
    if (mp.player.playerName === r.recorderName) {
      info.recorderTeam = mp.team;
    }
  }

  // Primary player = most frequent recorder across the replays
  const recorderCounts = new Map();
  for (const [, info] of replayInfoMap) {
    if (info.recorderName) {
      recorderCounts.set(info.recorderName, (recorderCounts.get(info.recorderName) ?? 0) + 1);
    }
  }
  const primaryPlayer =
    [...recorderCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Aggregate per player: overall + split by teammate/opponent role
  const playerMap = new Map();
  for (const mp of filtered) {
    if (mp.player.isBot) continue;
    const name = mp.player.playerName;
    if (!playerMap.has(name)) {
      playerMap.set(name, {
        name,
        platform:    mp.player.platform,
        overall:     buildEmptyStats(),
        asTeammate:  buildEmptyStats(),
        asOpponent:  buildEmptyStats(),
      });
    }

    const p    = playerMap.get(name);
    const info = replayInfoMap.get(mp.replayId);
    const isWin  = info?.winningTeam != null && info.winningTeam === mp.team;
    const isLoss = info?.winningTeam != null && info.winningTeam !== mp.team;

    accumulate(p.overall, mp, isWin, isLoss);

    if (info?.recorderTeam != null) {
      if (mp.team === info.recorderTeam) accumulate(p.asTeammate, mp, isWin, isLoss);
      else                               accumulate(p.asOpponent, mp, isWin, isLoss);
    }
  }

  const players = [...playerMap.values()]
    .map((p) => ({
      name:        p.name,
      platform:    p.platform,
      overall:     finalizeStats(p.overall),
      asTeammate:  finalizeStats(p.asTeammate),
      asOpponent:  finalizeStats(p.asOpponent),
    }))
    .sort((a, b) => b.overall.gamesPlayed - a.overall.gamesPlayed);

  return {
    dateFrom:      dateFrom ?? null,
    dateTo:        dateTo   ?? null,
    replayCount:   replayInfoMap.size,
    primaryPlayer,
    players,
    replays:       [...replayInfoMap.values()],
  };
}
