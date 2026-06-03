import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../lib/prisma.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "output");

async function readJsonOptional(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function batchCreateMany(model, rows, chunkSize = 1000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await model.createMany({ data: rows.slice(i, i + chunkSize) });
  }
}

async function main() {
  const [currentReplay, finalStats, timeline, boostPickupsData, positionData, heatmapManifest] =
    await Promise.all([
      readJsonOptional(path.join(OUTPUT_DIR, "current-replay.json")),
      readJsonOptional(path.join(OUTPUT_DIR, "final-player-stats.json")),
      readJsonOptional(path.join(OUTPUT_DIR, "game-timeline.json")),
      readJsonOptional(path.join(OUTPUT_DIR, "boost-pickup-stats-v2.json")),
      readJsonOptional(path.join(OUTPUT_DIR, "player-position-timeline.json")),
      readJsonOptional(path.join(OUTPUT_DIR, "heatmaps", "heatmap-manifest.json")),
    ]);

  if (!finalStats) {
    throw new Error("final-player-stats.json not found — cannot persist to DB");
  }

  if (!currentReplay?.fileName) throw new Error("fileName missing from current-replay.json");
  const replayId = path.basename(currentReplay.fileName, ".replay");

  const existing = await prisma.replay.findUnique({ where: { replayId }, select: { replayId: true } });
  if (existing) {
    console.log(`Replay ${replayId} already in DB — skipping.`);
    return;
  }

  // ── Derive score + winning team from last goal event ────────────────────────
  let team0Score = 0;
  let team1Score = 0;
  let winningTeam = null;
  const goalEvents = (timeline?.events ?? []).filter((e) => e.type === "goal");
  if (goalEvents.length > 0) {
    const lastGoal = goalEvents[goalEvents.length - 1];
    team0Score = lastGoal.scoreAfter?.team0 ?? 0;
    team1Score = lastGoal.scoreAfter?.team1 ?? 0;
    if (team0Score > team1Score) winningTeam = 0;
    else if (team1Score > team0Score) winningTeam = 1;
  }

  // ── 1. Upsert Players ────────────────────────────────────────────────────────
  const playerMap = {}; // playerName → player.id
  for (const p of finalStats.players ?? []) {
    const player = await prisma.player.upsert({
      where: { playerName: p.playerName },
      update: { platform: p.platform ?? undefined, onlineId: p.onlineId ?? undefined, isBot: p.isBot ?? false },
      create: { playerName: p.playerName, platform: p.platform ?? null, onlineId: p.onlineId ?? null, isBot: p.isBot ?? false },
    });
    playerMap[p.playerName] = player.id;
  }

  // Also upsert any players referenced only in timeline events (victims)
  const timelinePlayerNames = new Set();
  for (const e of timeline?.events ?? []) {
    if (e.playerName) timelinePlayerNames.add(e.playerName);
    if (e.victimPlayerName) timelinePlayerNames.add(e.victimPlayerName);
  }
  for (const name of timelinePlayerNames) {
    if (!playerMap[name]) {
      const player = await prisma.player.upsert({
        where: { playerName: name },
        update: {},
        create: { playerName: name },
      });
      playerMap[name] = player.id;
    }
  }

  // ── 2. Upsert Replay ────────────────────────────────────────────────────────
  const replayData = {
    fileName: currentReplay?.fileName ?? `${replayId}.replay`,
    replayName: finalStats.replayName ?? null,
    mapName: finalStats.mapName ?? "",
    matchType: finalStats.matchType ?? null,
    teamSize: finalStats.teamSize ?? 0,
    unfairTeamSize: Boolean(finalStats.unfairTeamSize),
    serverRegion: finalStats.serverRegion ?? null,
    playlist: finalStats.playlist ?? null,
    overtime: finalStats.overtime ?? false,
    forfeit: finalStats.forfeit ?? false,
    totalSecondsPlayed: finalStats.totalSecondsPlayed ?? null,
    matchStartEpoch: finalStats.matchStartEpoch != null ? BigInt(finalStats.matchStartEpoch) : null,
    date: finalStats.date ?? null,
    recorderName: finalStats.recorderName ?? null,
    winningTeam,
    team0Score,
    team1Score,
  };
  await prisma.replay.upsert({
    where: { replayId },
    update: replayData,
    create: { replayId, ...replayData },
  });

  // ── 3. Upsert MatchPlayers + Camera + Loadout ────────────────────────────────
  const matchPlayerMap = {}; // playerName → matchPlayer.id
  for (const p of finalStats.players ?? []) {
    const playerId = playerMap[p.playerName];
    const mp = await prisma.matchPlayer.upsert({
      where: { replayId_playerId: { replayId, playerId } },
      update: {
        team: p.team ?? 0,
        score: p.score ?? 0,
        goals: p.goals ?? 0,
        shots: p.shots ?? 0,
        assists: p.assists ?? 0,
        saves: p.saves ?? 0,
        shootingPercentage: p.shootingPercentage ?? 0,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        boostUsed: p.boostUsed ?? null,
        bpm: p.bpm ?? null,
        averageBoost: p.averageBoost ?? null,
        boostCollectedApprox: p.boostCollectedApprox ?? null,
        zeroBoostSeconds: p.zeroBoostSeconds ?? null,
        fullBoostSeconds: p.fullBoostSeconds ?? null,
        boost0To25Seconds: p.boost0To25Seconds ?? null,
        boost25To50Seconds: p.boost25To50Seconds ?? null,
        boost50To75Seconds: p.boost50To75Seconds ?? null,
        boost75To100Seconds: p.boost75To100Seconds ?? null,
        boost0To25Pct: p.boost0To25Pct ?? null,
        boost25To50Pct: p.boost25To50Pct ?? null,
        boost50To75Pct: p.boost50To75Pct ?? null,
        boost75To100Pct: p.boost75To100Pct ?? null,
        boostUsedWhileSupersonic: p.boostUsedWhileSupersonic ?? null,
        pickups: p.pickups ?? 0,
        bigPads: p.bigPads ?? 0,
        smallPads: p.smallPads ?? 0,
        unknownPads: p.unknownPads ?? 0,
        boostStolen: p.boostStolen ?? 0,
        actualPickupGain: p.actualPickupGain ?? null,
        theoreticalPickupEstimate: p.theoreticalPickupEstimate ?? null,
        maxSpeedUU: p.maxSpeedUU ?? null,
        avgSpeedUU: p.avgSpeedUU ?? null,
        supersonicSeconds: p.supersonicSeconds ?? null,
        supersonicPct: p.supersonicPct ?? null,
        airborneSeconds: p.airborneSeconds ?? null,
        airbornePct: p.airbornePct ?? null,
        avgThrottle: p.avgThrottle ?? null,
        handbrakeUsagePct: p.handbrakeUsagePct ?? null,
        airRolls: p.airRolls ?? null,
        dodgeCount: p.dodgeCount ?? null,
        doubleJumps: p.doubleJumps ?? null,
        dodgesRefreshed: p.dodgesRefreshed ?? null,
        avgSteerDeviation: p.avgSteerDeviation ?? null,
        avgPing: p.avgPing ?? null,
        maxPing: p.maxPing ?? null,
        worstNetQuality: p.worstNetQuality ?? null,
        titleId: p.titleId ?? null,
        totalGameTimePlayed: p.totalGameTimePlayed ?? null,
        priActorId: p.priActorId ?? null,
        partyLeaderId: p.partyLeaderId ?? null,
      },
      create: {
        playerId,
        replayId,
        team: p.team ?? 0,
        score: p.score ?? 0,
        goals: p.goals ?? 0,
        shots: p.shots ?? 0,
        assists: p.assists ?? 0,
        saves: p.saves ?? 0,
        shootingPercentage: p.shootingPercentage ?? 0,
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        boostUsed: p.boostUsed ?? null,
        bpm: p.bpm ?? null,
        averageBoost: p.averageBoost ?? null,
        boostCollectedApprox: p.boostCollectedApprox ?? null,
        zeroBoostSeconds: p.zeroBoostSeconds ?? null,
        fullBoostSeconds: p.fullBoostSeconds ?? null,
        boost0To25Seconds: p.boost0To25Seconds ?? null,
        boost25To50Seconds: p.boost25To50Seconds ?? null,
        boost50To75Seconds: p.boost50To75Seconds ?? null,
        boost75To100Seconds: p.boost75To100Seconds ?? null,
        boost0To25Pct: p.boost0To25Pct ?? null,
        boost25To50Pct: p.boost25To50Pct ?? null,
        boost50To75Pct: p.boost50To75Pct ?? null,
        boost75To100Pct: p.boost75To100Pct ?? null,
        boostUsedWhileSupersonic: p.boostUsedWhileSupersonic ?? null,
        pickups: p.pickups ?? 0,
        bigPads: p.bigPads ?? 0,
        smallPads: p.smallPads ?? 0,
        unknownPads: p.unknownPads ?? 0,
        boostStolen: p.boostStolen ?? 0,
        actualPickupGain: p.actualPickupGain ?? null,
        theoreticalPickupEstimate: p.theoreticalPickupEstimate ?? null,
        maxSpeedUU: p.maxSpeedUU ?? null,
        avgSpeedUU: p.avgSpeedUU ?? null,
        supersonicSeconds: p.supersonicSeconds ?? null,
        supersonicPct: p.supersonicPct ?? null,
        airborneSeconds: p.airborneSeconds ?? null,
        airbornePct: p.airbornePct ?? null,
        avgThrottle: p.avgThrottle ?? null,
        handbrakeUsagePct: p.handbrakeUsagePct ?? null,
        airRolls: p.airRolls ?? null,
        dodgeCount: p.dodgeCount ?? null,
        doubleJumps: p.doubleJumps ?? null,
        dodgesRefreshed: p.dodgesRefreshed ?? null,
        avgSteerDeviation: p.avgSteerDeviation ?? null,
        avgPing: p.avgPing ?? null,
        maxPing: p.maxPing ?? null,
        worstNetQuality: p.worstNetQuality ?? null,
        titleId: p.titleId ?? null,
        totalGameTimePlayed: p.totalGameTimePlayed ?? null,
        priActorId: p.priActorId ?? null,
        partyLeaderId: p.partyLeaderId ?? null,
      },
    });
    matchPlayerMap[p.playerName] = mp.id;

    // Camera
    if (p.camera) {
      await prisma.cameraSettings.upsert({
        where: { matchPlayerId: mp.id },
        update: { fov: p.camera.fov ?? null, height: p.camera.height ?? null, angle: p.camera.angle ?? null, distance: p.camera.distance ?? null, stiffness: p.camera.stiffness ?? null, swivel: p.camera.swivel ?? null },
        create: { matchPlayerId: mp.id, fov: p.camera.fov ?? null, height: p.camera.height ?? null, angle: p.camera.angle ?? null, distance: p.camera.distance ?? null, stiffness: p.camera.stiffness ?? null, swivel: p.camera.swivel ?? null },
      });
    }

    // Loadout
    if (p.loadout || p.onlineLoadout) {
      await prisma.loadout.upsert({
        where: { matchPlayerId: mp.id },
        update: { body: p.loadout?.body ?? null, decal: p.loadout?.decal ?? null, wheels: p.loadout?.wheels ?? null, rocketTrail: p.loadout?.rocketTrail ?? null, antenna: p.loadout?.antenna ?? null, topper: p.loadout?.topper ?? null, goalExplosion: p.loadout?.goalExplosion ?? null, onlineLoadout: p.onlineLoadout ?? null },
        create: { matchPlayerId: mp.id, body: p.loadout?.body ?? null, decal: p.loadout?.decal ?? null, wheels: p.loadout?.wheels ?? null, rocketTrail: p.loadout?.rocketTrail ?? null, antenna: p.loadout?.antenna ?? null, topper: p.loadout?.topper ?? null, goalExplosion: p.loadout?.goalExplosion ?? null, onlineLoadout: p.onlineLoadout ?? null },
      });
    }
  }

  // ── 4. Upsert BallStats ──────────────────────────────────────────────────────
  if (finalStats.possession || finalStats.ballSpeed || finalStats.ballAerial) {
    const bs = {
      team0PossessionSeconds: finalStats.possession?.team0Seconds ?? null,
      team1PossessionSeconds: finalStats.possession?.team1Seconds ?? null,
      team0PossessionPct: finalStats.possession?.team0Pct ?? null,
      team1PossessionPct: finalStats.possession?.team1Pct ?? null,
      maxSpeedUU: finalStats.ballSpeed?.maxSpeedUU ?? null,
      avgSpeedUU: finalStats.ballSpeed?.avgSpeedUU ?? null,
      speedSampleCount: finalStats.ballSpeed?.sampleCount ?? null,
      aerialSamples: finalStats.ballAerial?.aerialSamples ?? null,
      totalSamples: finalStats.ballAerial?.totalSamples ?? null,
      aerialPct: finalStats.ballAerial?.aerialPct ?? null,
    };
    await prisma.ballStats.upsert({
      where: { replayId },
      update: bs,
      create: { replayId, ...bs },
    });
  }

  // ── 5. Upsert TimelineEvents ─────────────────────────────────────────────────
  for (const e of timeline?.events ?? []) {
    const eventData = {
      type: e.type,
      frameIndex: e.frameIndex ?? 0,
      replayTimeSeconds: e.replayTimeSeconds ?? 0,
      elapsedSeconds: e.elapsedSeconds ?? null,
      elapsedClock: e.elapsedClock ?? null,
      gameSecondsRemaining: e.gameSecondsRemaining ?? null,
      gameClockElapsed: e.gameClockElapsed ?? null,
      gameClockElapsedSeconds: e.gameClockElapsedSeconds ?? null,
      source: e.source ?? null,
      playerName: e.playerName ?? "",
      playerId: playerMap[e.playerName] ?? null,
      team: e.team ?? null,
      counterValue: e.counterValue ?? null,
      victimPlayerName: e.victimPlayerName ?? null,
      victimPlayerId: e.victimPlayerName ? (playerMap[e.victimPlayerName] ?? null) : null,
      victimTeam: e.victimTeam ?? null,
      killerPlayerName: e.killerPlayerName ?? null,
      scoreAfterTeam0: e.scoreAfter?.team0 ?? null,
      scoreAfterTeam1: e.scoreAfter?.team1 ?? null,
      timelineElapsedSeconds: e.timelineElapsedSeconds ?? null,
    };
    await prisma.timelineEvent.upsert({
      where: { replayId_eventId: { replayId, eventId: e.id } },
      update: eventData,
      create: { replayId, eventId: e.id, ...eventData },
    });
  }

  // ── 6. Highlights (delete + recreate) ───────────────────────────────────────
  await prisma.highlight.deleteMany({ where: { replayId } });
  if ((finalStats.highlights ?? []).length > 0) {
    await prisma.highlight.createMany({
      data: finalStats.highlights.map((h) => ({
        replayId,
        frame: h.frame ?? null,
        carName: h.carName ?? null,
        ballName: h.ballName ?? null,
        goalActorName: h.goalActorName ?? null,
      })),
    });
  }

  // ── 7. BoostPickups (delete + batched recreate) ──────────────────────────────
  await prisma.boostPickup.deleteMany({ where: { replayId } });
  const pickupEvents = boostPickupsData?.events ?? [];
  if (pickupEvents.length > 0) {
    const pickupRows = pickupEvents
      .filter((e) => matchPlayerMap[e.playerName])
      .map((e) => ({
        matchPlayerId: matchPlayerMap[e.playerName],
        replayId,
        frameIndex: e.frameIndex ?? 0,
        time: e.time ?? 0,
        padType: e.padType ?? "unknown",
        isStolen: e.isStolen ?? false,
        estimatedBoostGain: e.estimatedBoostGain ?? null,
        x: e.carLocationAtPickup?.x ?? e.location?.x ?? null,
        y: e.carLocationAtPickup?.y ?? e.location?.y ?? null,
        z: e.carLocationAtPickup?.z ?? e.location?.z ?? null,
      }));
    await batchCreateMany(prisma.boostPickup, pickupRows);
  }

  // ── 8. PlayerPositionSamples (delete + batched recreate) ────────────────────
  await prisma.playerPositionSample.deleteMany({ where: { replayId } });
  for (const player of positionData?.players ?? []) {
    const matchPlayerId = matchPlayerMap[player.playerName];
    if (!matchPlayerId) continue;
    const rows = player.samples.map((s) => ({
      matchPlayerId,
      replayId,
      frameIndex: s.frameIndex ?? 0,
      time: s.time ?? 0,
      elapsedSeconds: s.elapsedSeconds ?? null,
      x: s.x ?? 0,
      y: s.y ?? 0,
      z: s.z ?? 0,
      qx: s.qx ?? null,
      qy: s.qy ?? null,
      qz: s.qz ?? null,
      qw: s.qw ?? null,
      vx: s.vx ?? null,
      vy: s.vy ?? null,
      vz: s.vz ?? null,
      boostAmount: s.boostAmount != null ? s.boostAmount : null,
      throttle: s.throttle != null ? s.throttle : null,
    }));
    await batchCreateMany(prisma.playerPositionSample, rows);
  }

  // ── 9. Heatmaps ──────────────────────────────────────────────────────────────
  for (const h of heatmapManifest?.heatmaps ?? []) {
    const heatmapData = {
      team: h.team ?? null,
      priActorId: h.priActorId ?? null,
      sampleCount: h.sampleCount ?? null,
      inBoundsCount: h.inBoundsCount ?? null,
      skippedCount: h.skippedCount ?? null,
      filename: h.filename ?? null,
      filePath: h.path ?? null,
    };
    await prisma.heatmap.upsert({
      where: { replayId_playerName: { replayId, playerName: h.playerName } },
      update: heatmapData,
      create: { replayId, playerName: h.playerName, ...heatmapData },
    });
  }

  const playerCount = finalStats.players?.length ?? 0;
  const pickupCount = pickupEvents.length;
  const positionCount = positionData?.players?.reduce((sum, p) => sum + (p.samples?.length ?? 0), 0) ?? 0;
  console.log(`Persisted replay ${replayId}: ${playerCount} players, ${pickupCount} pickups, ${positionCount} position samples`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (err) => {
    console.error("persistToDb failed:", err.message);
    await prisma.$disconnect();
    process.exit(1);
  });
