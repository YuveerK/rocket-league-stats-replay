import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = process.cwd();

const BOOST_STATS_PATH = path.join(ROOT_DIR, "output", "boost-stats-v2.json");
const PICKUP_STATS_PATH = path.join(ROOT_DIR, "output", "boost-pickup-stats-v2.json");
const TIMELINE_PATH = path.join(ROOT_DIR, "output", "game-timeline.json");
const BALL_STATS_PATH = path.join(ROOT_DIR, "output", "ball-stats.json");
const ADVANCED_STATS_PATH = path.join(ROOT_DIR, "output", "advanced-player-stats.json");
const MATCH_META_PATH = path.join(ROOT_DIR, "output", "match-meta.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "final-player-stats.json");

function shootingPercentage(goals, shots) {
  if (!shots || shots <= 0) return 0;
  return Number(((goals / shots) * 100).toFixed(2));
}

export function combinePlayerStats({ boostStats, boostPickups, timeline, ballStats, advancedStats, matchMeta }) {
  const pickupByPlayer = new Map(
    (boostPickups?.players ?? []).map((player) => [player.playerName, player]),
  );
  const timelineByPlayer = new Map(
    (timeline?.players ?? []).map((player) => [player.playerName, player]),
  );
  const advancedByPlayer = new Map(
    (advancedStats?.players ?? []).map((player) => [player.playerName, player]),
  );
  const metaPlayersByName = new Map(
    (matchMeta?.players ?? []).map((p) => [p.name, p]),
  );

  const players = (boostStats?.players ?? []).map((player) => {
    const pickup = pickupByPlayer.get(player.playerName);
    const timelinePlayer = timelineByPlayer.get(player.playerName);
    const advanced = advancedByPlayer.get(player.playerName);
    const meta = metaPlayersByName.get(player.playerName);

    if (pickup && pickup.team !== undefined && pickup.team !== player.team) {
      console.warn(`Team mismatch for ${player.playerName}: boost=${player.team}, pickup=${pickup.team}`);
    }

    return {
      playerName: player.playerName,
      team: player.team,
      score: player.score,
      goals: player.goals,
      shots: player.shots,
      assists: player.assists,
      saves: player.saves,
      shootingPercentage: shootingPercentage(player.goals, player.shots),
      kills: timelinePlayer?.kills ?? 0,
      deaths: timelinePlayer?.deaths ?? 0,

      boostUsed: player.boostUsed,
      bpm: player.bpm,
      averageBoost: player.averageBoost,
      boostCollectedApprox: player.boostCollectedApprox,
      zeroBoostSeconds: player.zeroBoostSeconds ?? 0,
      fullBoostSeconds: player.fullBoostSeconds ?? 0,

      pickups: pickup?.pickups ?? 0,
      bigPads: pickup?.bigPads ?? 0,
      smallPads: pickup?.smallPads ?? 0,
      unknownPads: pickup?.unknownPads ?? 0,
      boostStolen: pickup?.boostStolen ?? 0,
      actualPickupGain: pickup?.boostCollectedActualGain ?? 0,
      theoreticalPickupEstimate: pickup?.boostCollectedTheoreticalEstimate ?? 0,

      maxSpeedUU: advanced?.maxSpeedUU ?? null,
      avgSpeedUU: advanced?.avgSpeedUU ?? null,
      supersonicSeconds: advanced?.supersonicSeconds ?? null,
      supersonicPct: advanced?.supersonicPct ?? null,
      airborneSeconds: advanced?.airborneSeconds ?? null,
      airbornePct: advanced?.airbornePct ?? null,
      avgThrottle: advanced?.avgThrottle ?? null,
      handbrakeUsagePct: advanced?.handbrakeUsagePct ?? null,
      avgPing: advanced?.avgPing ?? null,
      maxPing: advanced?.maxPing ?? null,
      titleId: advanced?.titleId ?? null,
      partyLeaderId: advanced?.partyLeaderId ?? null,
      totalGameTimePlayed: advanced?.totalGameTimePlayed ?? null,
      worstNetQuality: advanced?.worstNetQuality ?? null,
      airActivations: advanced?.airActivations ?? null,
      dodgesRefreshed: advanced?.dodgesRefreshed ?? null,
      dodgeCount: advanced?.dodgeCount ?? null,
      doubleJumps: advanced?.doubleJumps ?? null,
      avgSteerDeviation: advanced?.avgSteerDeviation ?? null,
      isBot: meta?.isBot ?? false,
      platform: meta?.platform ?? null,
      onlineId: meta?.onlineId ?? null,
      camera: advanced?.camera ?? null,
      loadout: advanced?.loadout ?? null,
      onlineLoadout: advanced?.onlineLoadout ?? null,
    };
  });

  return {
    replayName: boostStats?.replayName ?? null,
    replayId: boostStats?.replayId ?? null,
    mapName: boostStats?.mapName ?? null,
    overtime: matchMeta?.overtime ?? false,
    forfeit: matchMeta?.forfeit ?? false,
    totalSecondsPlayed: matchMeta?.totalSecondsPlayed ?? null,
    matchStartEpoch: matchMeta?.matchStartEpoch ?? null,
    matchType: matchMeta?.matchType ?? null,
    teamSize: matchMeta?.teamSize ?? null,
    recorderName: matchMeta?.recorderName ?? null,
    unfairTeamSize: matchMeta?.unfairTeamSize ?? false,
    date: matchMeta?.date ?? null,
    serverRegion: matchMeta?.serverRegion ?? null,
    playlist: matchMeta?.playlist ?? null,
    highlights: matchMeta?.highlights ?? [],
    statMilestones: matchMeta?.statMilestones ?? [],
    possession: ballStats?.possession ?? null,
    ballSpeed: ballStats?.ballSpeed ?? null,
    ballAerial: ballStats?.ballAerial ?? null,
    notes: [
      "Goals, shots, assists, saves and score come from replay header stats.",
      "Kills and deaths come from game-timeline demolition/death events when present.",
      "Boost used, BPM and average boost come from ReplicatedBoost.boost_amount.",
      "Boost collected approx comes from positive boost meter changes.",
      "Pickups, big pads, small pads and stolen boost are estimated from pickup events and car location.",
      "Speed, supersonic %, airborne % come from car ReplicatedRBState velocity magnitude.",
      "Possession comes from TAGame.Ball_TA:HitTeamNum transitions.",
      "Overtime and forfeit come from network frames and replay properties.",
      "serverRegion from ProjectX.GRI_X:ReplicatedServerRegion. playlist is the raw playlist Int.",
      "avgPing/maxPing come from Engine.PlayerReplicationInfo:Ping.",
      "airActivations = max AirActivateCount — all air-button presses while airborne (double-jumps, flips, air rolls). dodgeCount = DodgeTorque update count.",
      "dodgesRefreshed = max DodgesRefreshedCounter (wall/ceiling touches restoring dodge).",
      "partyLeaderId groups players in the same party. isBot/platform/onlineId from replay header.",
    ],
    players,
  };
}

async function readJsonOptional(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function main() {
  const boostStats = JSON.parse(await fs.readFile(BOOST_STATS_PATH, "utf8"));
  const boostPickups = JSON.parse(await fs.readFile(PICKUP_STATS_PATH, "utf8"));
  const timeline = await readJsonOptional(TIMELINE_PATH);
  const ballStats = await readJsonOptional(BALL_STATS_PATH);
  const advancedStats = await readJsonOptional(ADVANCED_STATS_PATH);
  const matchMeta = await readJsonOptional(MATCH_META_PATH);

  const output = combinePlayerStats({ boostStats, boostPickups, timeline, ballStats, advancedStats, matchMeta });

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log(`\nOvertime: ${output.overtime} | Forfeit: ${output.forfeit}`);
  if (output.possession) {
    console.log(`Ball possession: Team 0 ${output.possession.team0Pct}% | Team 1 ${output.possession.team1Pct}%`);
  }
  if (output.statMilestones.length > 0) {
    console.log(`Milestones: ${output.statMilestones.map((m) => `${m.playerName}: ${m.milestone}`).join(", ")}`);
  }

  console.log("\nFinal per-player stats:");
  console.table(
    output.players.map((player) => ({
      Player: player.playerName,
      Team: player.team,
      Score: player.score,
      Goals: player.goals,
      Shots: player.shots,
      Assists: player.assists,
      Saves: player.saves,
      Kills: player.kills,
      Deaths: player.deaths,
      "Shooting %": `${player.shootingPercentage}%`,
      "Boost Used": player.boostUsed,
      BPM: player.bpm,
      "Max Speed": player.maxSpeedUU ?? "n/a",
      "Supersonic %": player.supersonicPct !== null ? `${player.supersonicPct}%` : "n/a",
      "Airborne %": player.airbornePct !== null ? `${player.airbornePct}%` : "n/a",
      "Handbrake %": player.handbrakeUsagePct !== null ? `${player.handbrakeUsagePct}%` : "n/a",
    })),
  );

  console.log(`\nSaved final stats to: ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to combine player stats:");
    console.error(error);
    process.exit(1);
  });
}
