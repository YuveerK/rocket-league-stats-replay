import { readOutput } from "../repositories/output.repository.js";
import { carDisplayName } from "../utils/format.js";

function latestPositionAt(samples, elapsedSeconds) {
  if (!samples?.length || elapsedSeconds == null) return null;
  let lo = 0, hi = samples.length - 1, best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const sample = samples[mid];
    if ((sample.elapsedSeconds ?? 0) <= elapsedSeconds) { best = sample; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

export async function getOverviewData() {
  const [finalStats, timeline, ballStats, matchMeta, playerMapping, advancedStats, positions] =
    await Promise.all([
      readOutput("final-player-stats.json"),
      readOutput("game-timeline.json"),
      readOutput("ball-stats.json"),
      readOutput("match-meta.json"),
      readOutput("player-mapping.json"),
      readOutput("advanced-player-stats.json"),
      readOutput("player-position-timeline.json"),
    ]);

  if (!finalStats) return null;

  const platformByName = new Map((playerMapping?.players ?? []).map((p) => [p.playerName, p.platform]));
  const advancedByName = new Map((advancedStats?.players ?? []).map((p) => [p.playerName, p]));
  const positionByName = new Map((positions?.players ?? []).map((p) => [p.playerName, p.samples ?? []]));
  const defenderConcedesByName = new Map((finalStats.players ?? []).map((p) => [p.playerName, 0]));
  const defThird = -5120 + 10240 / 3;

  const maxPositionElapsedSeconds = Math.max(
    0, ...(positions?.players ?? []).flatMap((p) => (p.samples ?? []).map((s) => s.elapsedSeconds ?? 0)),
  );
  const maxEventElapsedSeconds = Math.max(0, ...(timeline?.events ?? []).map((e) => e.elapsedSeconds ?? 0));
  const maxTimelineElapsedSeconds = Math.max(0, ...(timeline?.events ?? []).map((e) => e.timelineElapsedSeconds ?? 0));
  const maxGameClockElapsedSeconds = Math.max(0, ...(timeline?.events ?? []).map((e) => e.gameClockElapsedSeconds ?? 0));

  const headerDuration =
    finalStats.totalSecondsPlayed ?? matchMeta?.totalSecondsPlayed ?? timeline?.totalSecondsPlayed ?? null;
  const isForfeit = finalStats.forfeit ?? matchMeta?.forfeit ?? false;
  const isOvertime =
    finalStats.overtime ?? matchMeta?.overtime ?? timeline?.overtime ??
    (headerDuration != null && headerDuration > 315);
  const useMatchClockTimeline = isForfeit || isOvertime;

  // Use header TotalSecondsPlayed as authoritative duration — timelineSecondsPlayed can over-count
  // by including between-goal countdown dead time that isn't fully stripped.
  const totalSecondsPlayed =
    headerDuration ??
    (maxGameClockElapsedSeconds > 0 ? Number(maxGameClockElapsedSeconds.toFixed(3)) : null) ??
    timeline?.timelineSecondsPlayed ??
    (maxTimelineElapsedSeconds > 0 ? Number(maxTimelineElapsedSeconds.toFixed(3)) : null) ??
    (maxEventElapsedSeconds > 0 ? Number(maxEventElapsedSeconds.toFixed(3)) : null) ??
    (maxPositionElapsedSeconds > 0 ? Number(maxPositionElapsedSeconds.toFixed(3)) : null);

  for (const goal of timeline?.events ?? []) {
    if (goal.type !== "goal" || goal.team == null) continue;
    for (const p of finalStats.players ?? []) {
      if (p.team == null || p.team === goal.team) continue;
      const sample = latestPositionAt(positionByName.get(p.playerName), goal.elapsedSeconds);
      if (!sample) continue;
      const ownHalfY = p.team === 1 ? -sample.y : sample.y;
      if (ownHalfY < defThird) {
        defenderConcedesByName.set(p.playerName, (defenderConcedesByName.get(p.playerName) ?? 0) + 1);
      }
    }
  }

  const players = finalStats.players.map((p) => {
    const adv = advancedByName.get(p.playerName);
    return {
      playerName: p.playerName,
      team: p.team,
      platform: platformByName.get(p.playerName) ?? p.platform ?? null,
      isBot: p.isBot ?? false,
      car: carDisplayName(adv?.loadout?.body),
      score: p.score ?? 0,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      saves: p.saves ?? 0,
      shots: p.shots ?? 0,
      kills: p.kills ?? 0,
      deaths: p.deaths ?? 0,
      bpm: p.bpm ?? 0,
      boostCollectedApprox: p.boostCollectedApprox ?? 0,
      bigPads: p.bigPads ?? 0,
      smallPads: p.smallPads ?? 0,
      boostStolen: p.boostStolen ?? 0,
      shootingPercentage: p.shootingPercentage ?? 0,
      goalsConcededWhileDefender: defenderConcedesByName.get(p.playerName) ?? 0,
      supersonicPct: adv?.supersonicPct ?? p.supersonicPct ?? null,
      airbornePct: adv?.airbornePct ?? p.airbornePct ?? null,
      avgPing: p.avgPing ?? adv?.avgPing ?? null,
      maxPing: p.maxPing ?? adv?.maxPing ?? null,
      worstNetQuality: p.worstNetQuality ?? adv?.worstNetQuality ?? null,
      partyLeaderId: p.partyLeaderId ?? adv?.partyLeaderId ?? null,
      airRolls: p.airRolls ?? adv?.airRolls ?? null,
      dodgeCount: p.dodgeCount ?? adv?.dodgeCount ?? null,
      dodgesRefreshed: p.dodgesRefreshed ?? adv?.dodgesRefreshed ?? null,
      doubleJumps: p.doubleJumps ?? adv?.doubleJumps ?? null,
      avgSteerDeviation: p.avgSteerDeviation ?? adv?.avgSteerDeviation ?? null,
    };
  });

  const teams = {};
  for (const p of players) {
    if (p.team == null) continue;
    if (!teams[p.team]) {
      teams[p.team] = { goals: 0, shots: 0, assists: 0, saves: 0, kills: 0, bpmSum: 0, bpmCount: 0, boostCollected: 0, boostStolen: 0, bigPads: 0, smallPads: 0 };
    }
    const t = teams[p.team];
    t.goals += p.goals; t.shots += p.shots; t.assists += p.assists;
    t.saves += p.saves; t.kills += p.kills;
    t.boostCollected += p.boostCollectedApprox;
    t.boostStolen += p.boostStolen;
    t.bigPads += p.bigPads; t.smallPads += p.smallPads;
    if (p.bpm) { t.bpmSum += p.bpm; t.bpmCount++; }
  }

  for (const [key, t] of Object.entries(teams)) {
    teams[key] = {
      goals: t.goals, shots: t.shots, assists: t.assists, saves: t.saves,
      demosInflicted: t.kills,
      shootingPct: t.shots > 0 ? Number(((t.goals / t.shots) * 100).toFixed(1)) : 0,
      possession: ballStats?.possession?.[`team${key}Pct`] ?? null,
      bpm: t.bpmCount > 0 ? Number((t.bpmSum / t.bpmCount).toFixed(1)) : 0,
      boostCollected: Number(t.boostCollected.toFixed(1)),
      boostStolen: Number(t.boostStolen.toFixed(1)),
      bigPads: t.bigPads, smallPads: t.smallPads,
    };
  }

  return {
    match: {
      replayName: finalStats.replayName,
      mapName: finalStats.mapName,
      overtime: isOvertime,
      forfeit: isForfeit,
      totalSecondsPlayed,
      statMilestones: finalStats.statMilestones ?? [],
      scoreTeam0: players.filter((p) => p.team === 0).reduce((s, p) => s + p.goals, 0),
      scoreTeam1: players.filter((p) => p.team === 1).reduce((s, p) => s + p.goals, 0),
      serverRegion: finalStats.serverRegion ?? matchMeta?.serverRegion ?? null,
      playlist: finalStats.playlist ?? matchMeta?.playlist ?? null,
      matchType: finalStats.matchType ?? matchMeta?.matchType ?? null,
      teamSize: finalStats.teamSize ?? matchMeta?.teamSize ?? null,
      recorderName: finalStats.recorderName ?? matchMeta?.recorderName ?? null,
      date: finalStats.date ?? matchMeta?.date ?? null,
    },
    teams,
    players,
    events: (timeline?.events ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      timelineElapsedSeconds:
        useMatchClockTimeline && typeof e.gameClockElapsedSeconds === "number"
          ? Math.min(e.gameClockElapsedSeconds, totalSecondsPlayed ?? e.gameClockElapsedSeconds)
          : e.timelineElapsedSeconds,
      elapsedSeconds: e.elapsedSeconds,
      gameClockElapsedSeconds: e.gameClockElapsedSeconds,
      replayTimeSeconds: e.replayTimeSeconds,
      gameClockRemaining: e.gameClockRemaining,
      playerName: e.playerName,
      team: e.team,
      scoreAfter: e.scoreAfter ?? null,
      victimPlayerName: e.victimPlayerName ?? null,
    })),
  };
}

export async function getMovementData() {
  const [finalStats, advancedStats, matchMeta] = await Promise.all([
    readOutput("final-player-stats.json"),
    readOutput("advanced-player-stats.json"),
    readOutput("match-meta.json"),
  ]);

  if (!finalStats && !advancedStats) return null;

  const advancedByName = new Map((advancedStats?.players ?? []).map((p) => [p.playerName, p]));

  const players = (finalStats?.players ?? advancedStats?.players ?? []).map((p) => {
    const adv = advancedByName.get(p.playerName);
    return {
      playerName: p.playerName,
      team: p.team,
      platform: p.platform ?? null,
      isBot: p.isBot ?? false,
      airRolls: p.airRolls ?? adv?.airRolls ?? null,
      dodgeCount: p.dodgeCount ?? adv?.dodgeCount ?? null,
      dodgesRefreshed: p.dodgesRefreshed ?? adv?.dodgesRefreshed ?? null,
      doubleJumps: p.doubleJumps ?? adv?.doubleJumps ?? null,
      avgSteerDeviation: p.avgSteerDeviation ?? adv?.avgSteerDeviation ?? null,
      maxSpeedUU: p.maxSpeedUU ?? adv?.maxSpeedUU ?? null,
      avgSpeedUU: p.avgSpeedUU ?? adv?.avgSpeedUU ?? null,
      supersonicPct: p.supersonicPct ?? adv?.supersonicPct ?? null,
      supersonicSeconds: p.supersonicSeconds ?? adv?.supersonicSeconds ?? null,
      airbornePct: p.airbornePct ?? adv?.airbornePct ?? null,
      airborneSeconds: p.airborneSeconds ?? adv?.airborneSeconds ?? null,
      avgThrottle: p.avgThrottle ?? adv?.avgThrottle ?? null,
      handbrakeUsagePct: p.handbrakeUsagePct ?? adv?.handbrakeUsagePct ?? null,
      avgPing: p.avgPing ?? adv?.avgPing ?? null,
      maxPing: p.maxPing ?? adv?.maxPing ?? null,
      worstNetQuality: p.worstNetQuality ?? adv?.worstNetQuality ?? null,
      partyLeaderId: p.partyLeaderId ?? adv?.partyLeaderId ?? null,
      totalGameTimePlayed: p.totalGameTimePlayed ?? adv?.totalGameTimePlayed ?? null,
    };
  });

  return {
    replayName: finalStats?.replayName ?? advancedStats?.replayName ?? null,
    matchDuration: finalStats?.totalSecondsPlayed ?? matchMeta?.totalSecondsPlayed ?? null,
    players,
  };
}
