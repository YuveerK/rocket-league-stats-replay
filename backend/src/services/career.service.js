import { prisma } from "../../lib/prisma.js";

export async function getAllPlayers() {
  return prisma.player.findMany({
    select: { playerName: true, platform: true, isBot: true },
    where: { isBot: false },
    orderBy: { playerName: "asc" },
  });
}

export async function getCareerStats(playerName) {
  const matchPlayers = await prisma.matchPlayer.findMany({
    where: { player: { playerName } },
    include: {
      replay: {
        select: {
          replayId: true,
          fileName: true,
          mapName: true,
          date: true,
          winningTeam: true,
          team0Score: true,
          team1Score: true,
          overtime: true,
          forfeit: true,
          totalSecondsPlayed: true,
          playlist: true,
        },
      },
    },
    orderBy: { replay: { date: "asc" } },
  });

  if (!matchPlayers.length) return null;

  const matches = matchPlayers.map((mp) => {
    const r = mp.replay;
    const result =
      r.winningTeam === null ? "draw"
      : r.winningTeam === mp.team ? "win"
      : "loss";

    return {
      replayId: r.replayId,
      fileName: r.fileName,
      date: r.date,
      mapName: r.mapName,
      overtime: r.overtime,
      forfeit: r.forfeit,
      playlist: r.playlist,
      totalSecondsPlayed: r.totalSecondsPlayed,
      myTeam: mp.team,
      team0Score: r.team0Score,
      team1Score: r.team1Score,
      result,
      score: mp.score,
      goals: mp.goals,
      assists: mp.assists,
      saves: mp.saves,
      shots: mp.shots,
      shootingPercentage: mp.shootingPercentage,
      kills: mp.kills,
      deaths: mp.deaths,
      boostUsed: mp.boostUsed,
      bpm: mp.bpm,
      averageBoost: mp.averageBoost,
      supersonicPct: mp.supersonicPct,
      airbornePct: mp.airbornePct,
    };
  });

  const total = matches.length;
  const wins = matches.filter((m) => m.result === "win").length;
  const losses = matches.filter((m) => m.result === "loss").length;
  const draws = matches.filter((m) => m.result === "draw").length;

  function avg(key) {
    const vals = matches.map((m) => m[key]).filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  function sum(key) {
    return matches.reduce((a, m) => a + (m[key] ?? 0), 0);
  }

  const summary = {
    totalMatches: total,
    wins,
    losses,
    draws,
    winRate: total ? Math.round((wins / total) * 100) : 0,
    totalGoals: sum("goals"),
    totalAssists: sum("assists"),
    totalSaves: sum("saves"),
    totalShots: sum("shots"),
    totalScore: sum("score"),
    totalKills: sum("kills"),
    avgGoals: +avg("goals").toFixed(2),
    avgAssists: +avg("assists").toFixed(2),
    avgSaves: +avg("saves").toFixed(2),
    avgShots: +avg("shots").toFixed(2),
    avgScore: +avg("score").toFixed(1),
    avgShootingPct: +avg("shootingPercentage").toFixed(1),
    avgBpm: +avg("bpm").toFixed(1),
    avgBoost: +avg("averageBoost").toFixed(1),
    avgSupersonicPct: +avg("supersonicPct").toFixed(1),
    avgAirbornePct: +avg("airbornePct").toFixed(1),
  };

  // Per-map breakdown
  const mapMap = {};
  for (const m of matches) {
    if (!mapMap[m.mapName]) {
      mapMap[m.mapName] = { mapName: m.mapName, matches: 0, wins: 0, losses: 0, totalGoals: 0, totalScore: 0 };
    }
    const entry = mapMap[m.mapName];
    entry.matches++;
    if (m.result === "win") entry.wins++;
    if (m.result === "loss") entry.losses++;
    entry.totalGoals += m.goals ?? 0;
    entry.totalScore += m.score ?? 0;
  }
  const mapStats = Object.values(mapMap).map((m) => ({
    ...m,
    winRate: m.matches ? Math.round((m.wins / m.matches) * 100) : 0,
    avgGoals: +(m.totalGoals / m.matches).toFixed(2),
    avgScore: +(m.totalScore / m.matches).toFixed(1),
  })).sort((a, b) => b.matches - a.matches);

  // Trend: cumulative win rate over time + rolling per-match stats
  let cumulativeWins = 0;
  const trend = matches.map((m, i) => {
    if (m.result === "win") cumulativeWins++;
    return {
      index: i + 1,
      date: m.date,
      mapName: m.mapName,
      result: m.result,
      goals: m.goals,
      assists: m.assists,
      saves: m.saves,
      score: m.score,
      shootingPct: m.shootingPercentage,
      winRate: +((cumulativeWins / (i + 1)) * 100).toFixed(1),
    };
  });

  return { playerName, summary, matches: [...matches].reverse(), mapStats, trend };
}

function blankPeer(other, relation) {
  return {
    playerId: other.playerId,
    playerName: other.player.playerName,
    platform: other.player.platform,
    isBot: other.player.isBot,
    relation,
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalScore: 0,
    totalGoals: 0,
    totalAssists: 0,
    totalSaves: 0,
    totalShots: 0,
    totalKills: 0,
    shootingPctTotal: 0,
    shootingPctSamples: 0,
    bpmTotal: 0,
    bpmSamples: 0,
    lastPlayedAt: null,
    lastMapName: null,
  };
}

function addSubjectStats(entry, subject, replay, result) {
  entry.matches += 1;
  if (result === "win") entry.wins += 1;
  if (result === "loss") entry.losses += 1;
  if (result === "draw") entry.draws += 1;

  entry.totalScore += subject.score ?? 0;
  entry.totalGoals += subject.goals ?? 0;
  entry.totalAssists += subject.assists ?? 0;
  entry.totalSaves += subject.saves ?? 0;
  entry.totalShots += subject.shots ?? 0;
  entry.totalKills += subject.kills ?? 0;

  if (subject.shootingPercentage != null) {
    entry.shootingPctTotal += subject.shootingPercentage;
    entry.shootingPctSamples += 1;
  }

  if (subject.bpm != null) {
    entry.bpmTotal += subject.bpm;
    entry.bpmSamples += 1;
  }

  if (!entry.lastPlayedAt) {
    entry.lastPlayedAt = replay.date;
    entry.lastMapName = replay.mapName;
  }
}

function finalizePeer(entry) {
  return {
    playerId: entry.playerId,
    playerName: entry.playerName,
    platform: entry.platform,
    isBot: entry.isBot,
    relation: entry.relation,
    matches: entry.matches,
    wins: entry.wins,
    losses: entry.losses,
    draws: entry.draws,
    winRate: entry.matches ? Math.round((entry.wins / entry.matches) * 100) : 0,
    avgScore: entry.matches ? +(entry.totalScore / entry.matches).toFixed(1) : 0,
    avgGoals: entry.matches ? +(entry.totalGoals / entry.matches).toFixed(2) : 0,
    avgAssists: entry.matches ? +(entry.totalAssists / entry.matches).toFixed(2) : 0,
    avgSaves: entry.matches ? +(entry.totalSaves / entry.matches).toFixed(2) : 0,
    avgShots: entry.matches ? +(entry.totalShots / entry.matches).toFixed(2) : 0,
    avgDemos: entry.matches ? +(entry.totalKills / entry.matches).toFixed(2) : 0,
    avgShootingPct: entry.shootingPctSamples ? +(entry.shootingPctTotal / entry.shootingPctSamples).toFixed(1) : 0,
    avgBpm: entry.bpmSamples ? +(entry.bpmTotal / entry.bpmSamples).toFixed(1) : 0,
    lastPlayedAt: entry.lastPlayedAt,
    lastMapName: entry.lastMapName,
  };
}

function sortPeers(rows) {
  return rows.sort((a, b) => (
    b.matches - a.matches
    || b.winRate - a.winRate
    || a.playerName.localeCompare(b.playerName)
  ));
}

function qualified(rows) {
  return rows.filter((row) => row.matches >= 2);
}

export async function getPeerBreakdown(playerName) {
  const subjectMatches = await prisma.matchPlayer.findMany({
    where: { player: { playerName } },
    include: {
      player: {
        select: { id: true, playerName: true, platform: true, isBot: true },
      },
      replay: {
        select: {
          replayId: true,
          mapName: true,
          date: true,
          winningTeam: true,
          team0Score: true,
          team1Score: true,
          playlist: true,
          matchPlayers: {
            include: {
              player: {
                select: { id: true, playerName: true, platform: true, isBot: true },
              },
            },
          },
        },
      },
    },
    orderBy: { replay: { date: "desc" } },
  });

  if (!subjectMatches.length) return null;

  const teammateMap = new Map();
  const opponentMap = new Map();

  for (const subject of subjectMatches) {
    const replay = subject.replay;
    const result =
      replay.winningTeam === null ? "draw"
      : replay.winningTeam === subject.team ? "win"
      : "loss";

    for (const other of replay.matchPlayers) {
      if (other.playerId === subject.playerId) continue;

      const isTeammate = other.team === subject.team;
      const relation = isTeammate ? "teammate" : "opponent";
      const map = isTeammate ? teammateMap : opponentMap;
      const key = other.playerId;

      if (!map.has(key)) map.set(key, blankPeer(other, relation));
      addSubjectStats(map.get(key), subject, replay, result);
    }
  }

  const teammates = sortPeers([...teammateMap.values()].map(finalizePeer));
  const opponents = sortPeers([...opponentMap.values()].map(finalizePeer));
  const bestTeammate = [...qualified(teammates)].sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0] ?? teammates[0] ?? null;
  const toughestOpponent = [...qualified(opponents)].sort((a, b) => a.winRate - b.winRate || b.matches - a.matches)[0] ?? opponents[0] ?? null;

  return {
    playerName,
    summary: {
      totalMatches: subjectMatches.length,
      uniqueTeammates: teammates.length,
      uniqueOpponents: opponents.length,
      mostPlayedWith: teammates[0] ?? null,
      mostPlayedAgainst: opponents[0] ?? null,
      bestTeammate,
      toughestOpponent,
    },
    teammates,
    opponents,
  };
}

function resultForReplay(replay, team) {
  return replay.winningTeam === null ? "draw"
    : replay.winningTeam === team ? "win"
    : "loss";
}

function pct(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function average(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value != null);
  return values.length ? +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : 0;
}

function compareMapRows(aMaps, bMaps) {
  const map = new Map();

  for (const row of aMaps) {
    map.set(row.mapName, { mapName: row.mapName, playerA: row, playerB: null });
  }

  for (const row of bMaps) {
    const existing = map.get(row.mapName);
    if (existing) existing.playerB = row;
    else map.set(row.mapName, { mapName: row.mapName, playerA: null, playerB: row });
  }

  return [...map.values()].sort((a, b) => {
    const aMatches = (a.playerA?.matches ?? 0) + (a.playerB?.matches ?? 0);
    const bMatches = (b.playerA?.matches ?? 0) + (b.playerB?.matches ?? 0);
    return bMatches - aMatches || a.mapName.localeCompare(b.mapName);
  });
}

function comparePeerRows(aRows, bRows) {
  const bById = new Map(bRows.map((row) => [row.playerId, row]));

  return aRows
    .map((aRow) => {
      const bRow = bById.get(aRow.playerId);
      if (!bRow) return null;

      return {
        playerId: aRow.playerId,
        playerName: aRow.playerName,
        platform: aRow.platform ?? bRow.platform,
        playerA: {
          matches: aRow.matches,
          winRate: aRow.winRate,
          avgScore: aRow.avgScore,
          avgGoals: aRow.avgGoals,
        },
        playerB: {
          matches: bRow.matches,
          winRate: bRow.winRate,
          avgScore: bRow.avgScore,
          avgGoals: bRow.avgGoals,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      (b.playerA.matches + b.playerB.matches)
      - (a.playerA.matches + a.playerB.matches)
      || a.playerName.localeCompare(b.playerName)
    ));
}

export async function getPlayerCompare(playerAName, playerBName) {
  if (playerAName === playerBName) {
    const err = new Error("Choose two different players to compare.");
    err.statusCode = 400;
    throw err;
  }

  const [playerA, playerB, peersA, peersB] = await Promise.all([
    getCareerStats(playerAName),
    getCareerStats(playerBName),
    getPeerBreakdown(playerAName),
    getPeerBreakdown(playerBName),
  ]);

  if (!playerA || !playerB) return null;

  const sharedRows = await prisma.matchPlayer.findMany({
    where: {
      player: { playerName: { in: [playerAName, playerBName] } },
    },
    include: {
      player: {
        select: { playerName: true, platform: true, isBot: true },
      },
      replay: {
        select: {
          replayId: true,
          mapName: true,
          date: true,
          winningTeam: true,
          team0Score: true,
          team1Score: true,
          overtime: true,
          forfeit: true,
          playlist: true,
        },
      },
    },
    orderBy: { replay: { date: "desc" } },
  });

  const byReplay = new Map();
  for (const row of sharedRows) {
    if (!byReplay.has(row.replayId)) byReplay.set(row.replayId, []);
    byReplay.get(row.replayId).push(row);
  }

  const sharedMatches = [];
  for (const rows of byReplay.values()) {
    const a = rows.find((row) => row.player.playerName === playerAName);
    const b = rows.find((row) => row.player.playerName === playerBName);
    if (!a || !b) continue;

    const replay = a.replay;
    const sameTeam = a.team === b.team;

    sharedMatches.push({
      replayId: replay.replayId,
      date: replay.date,
      mapName: replay.mapName,
      playlist: replay.playlist,
      team0Score: replay.team0Score,
      team1Score: replay.team1Score,
      overtime: replay.overtime,
      forfeit: replay.forfeit,
      relationship: sameTeam ? "teammates" : "opponents",
      playerA: {
        team: a.team,
        result: resultForReplay(replay, a.team),
        score: a.score,
        goals: a.goals,
        assists: a.assists,
        saves: a.saves,
        shots: a.shots,
        shootingPercentage: a.shootingPercentage,
        kills: a.kills,
        bpm: a.bpm,
        averageBoost: a.averageBoost,
        supersonicPct: a.supersonicPct,
        airbornePct: a.airbornePct,
      },
      playerB: {
        team: b.team,
        result: resultForReplay(replay, b.team),
        score: b.score,
        goals: b.goals,
        assists: b.assists,
        saves: b.saves,
        shots: b.shots,
        shootingPercentage: b.shootingPercentage,
        kills: b.kills,
        bpm: b.bpm,
        averageBoost: b.averageBoost,
        supersonicPct: b.supersonicPct,
        airbornePct: b.airbornePct,
      },
    });
  }

  const sameTeamMatches = sharedMatches.filter((match) => match.relationship === "teammates");
  const oppositeMatches = sharedMatches.filter((match) => match.relationship === "opponents");
  const winsTogether = sameTeamMatches.filter((match) => match.playerA.result === "win").length;
  const lossesTogether = sameTeamMatches.filter((match) => match.playerA.result === "loss").length;
  const drawsTogether = sameTeamMatches.filter((match) => match.playerA.result === "draw").length;
  const playerAWinsVsB = oppositeMatches.filter((match) => match.playerA.result === "win").length;
  const playerBWinsVsA = oppositeMatches.filter((match) => match.playerB.result === "win").length;
  const drawsVs = oppositeMatches.filter((match) => match.playerA.result === "draw").length;

  return {
    playerA: {
      playerName: playerA.playerName,
      summary: playerA.summary,
      mapStats: playerA.mapStats,
    },
    playerB: {
      playerName: playerB.playerName,
      summary: playerB.summary,
      mapStats: playerB.mapStats,
    },
    summary: {
      sharedMatches: sharedMatches.length,
      sameTeamMatches: sameTeamMatches.length,
      oppositeTeamMatches: oppositeMatches.length,
      winsTogether,
      lossesTogether,
      drawsTogether,
      togetherWinRate: pct(winsTogether, sameTeamMatches.length),
      playerAWinsVsB,
      playerBWinsVsA,
      drawsVs,
      playerAWinRateVsB: pct(playerAWinsVsB, oppositeMatches.length),
      playerBWinRateVsA: pct(playerBWinsVsA, oppositeMatches.length),
      playerAAvgScoreShared: average(sharedMatches.map((match) => match.playerA), "score"),
      playerBAvgScoreShared: average(sharedMatches.map((match) => match.playerB), "score"),
      playerAAvgGoalsShared: average(sharedMatches.map((match) => match.playerA), "goals"),
      playerBAvgGoalsShared: average(sharedMatches.map((match) => match.playerB), "goals"),
    },
    commonMaps: compareMapRows(playerA.mapStats, playerB.mapStats),
    peerOverlap: {
      teammates: comparePeerRows(peersA?.teammates ?? [], peersB?.teammates ?? []),
      opponents: comparePeerRows(peersA?.opponents ?? [], peersB?.opponents ?? []),
    },
    sharedMatches: sharedMatches.slice(0, 50),
  };
}
