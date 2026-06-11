import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = process.cwd();

const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "boost-stats-v2.json");

function readJsonFileSafe(buffer) {
  let raw;

  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    raw = buffer.toString("utf16le");
  } else {
    raw = buffer.toString("utf8");
  }

  raw = raw.replace(/^﻿/, "").trim();
  return JSON.parse(raw);
}

function getLookupName(list, id) {
  if (!Array.isArray(list)) return null;
  if (typeof id !== "number") return null;

  const item = list[id];

  if (item === undefined || item === null) return null;
  if (typeof item === "string") return item;

  if (typeof item === "object") {
    return item.name ?? item.Name ?? item.value ?? JSON.stringify(item);
  }

  return String(item);
}

function getObjectName(item, objects, names) {
  return (
    getLookupName(objects, item.object_id) ??
    getLookupName(objects, item.objectId) ??
    getLookupName(names, item.name_id) ??
    getLookupName(names, item.nameId) ??
    item.object_name ??
    item.objectName ??
    item.name ??
    "unknown"
  );
}

function getActorId(item) {
  return item.actor_id ?? item.actorId ?? null;
}

function findStrings(value, result = []) {
  if (value === null || value === undefined) return result;

  if (typeof value === "string") {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) findStrings(item, result);
    return result;
  }

  if (typeof value === "object") {
    for (const child of Object.values(value)) findStrings(child, result);
  }

  return result;
}

function findNumbers(value, result = []) {
  if (value === null || value === undefined) return result;

  if (typeof value === "number") {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) findNumbers(item, result);
    return result;
  }

  if (typeof value === "object") {
    for (const child of Object.values(value)) findNumbers(child, result);
  }

  return result;
}

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const CAR_OBJECT_NAME = "Archetypes.Car.Car_Default";
const BOOST_OBJECT_NAME = "Archetypes.CarComponents.CarComponent_Boost";
const RIGID_BODY_STATE = "TAGame.RBActor_TA:ReplicatedRBState";
const SUPERSONIC_THRESHOLD = 2200;

function isTeamActorObject(objectName) {
  return (
    objectName === "Engine.TeamInfo" ||
    objectName === "TAGame.Team_TA" ||
    objectName.endsWith(".Team_TA")
  );
}

function getActiveActorId(numbers, activeActors, objectName) {
  return numbers.find(
    (number) => activeActors.get(number)?.objectName === objectName,
  );
}

function getActiveTeamActorId(numbers, activeActors) {
  return numbers.find((number) =>
    isTeamActorObject(activeActors.get(number)?.objectName ?? ""),
  );
}

function collectNumericLeaves(value, currentPath = "", result = []) {
  if (value === null || value === undefined) return result;

  if (typeof value === "number") {
    result.push({ path: currentPath, value });
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectNumericLeaves(item, `${currentPath}[${index}]`, result);
    });
    return result;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      collectNumericLeaves(child, nextPath, result);
    }
  }

  return result;
}

function velocityMagnitude(velocity) {
  if (!velocity || typeof velocity.x !== "number") return null;
  return Math.sqrt(
    velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z,
  );
}

function extractRawBoostValue(attribute) {
  const boostAmount = attribute?.ReplicatedBoost?.boost_amount;

  if (typeof boostAmount !== "number") return null;
  if (boostAmount < 0 || boostAmount > 255) return null;

  return boostAmount;
}

function normalizeBoost(rawValue, maxRawValue) {
  if (rawValue === null || rawValue === undefined) return null;

  if (maxRawValue > 100) {
    return Number(((rawValue / 255) * 100).toFixed(2));
  }

  return Number(rawValue.toFixed(2));
}

function getSpeedAtTime(speedSamples, time, cursorState) {
  if (!speedSamples.length || typeof time !== "number") return null;
  if (speedSamples[0].time > time) return null;

  while (
    cursorState.index < speedSamples.length - 1 &&
    speedSamples[cursorState.index + 1].time <= time
  ) {
    cursorState.index++;
  }

  return speedSamples[cursorState.index]?.speed ?? null;
}

function calculateBoostStats(
  samples,
  speedSamples,
  matchStart,
  matchEnd,
  maxRawValue,
) {
  if (!samples.length) {
    return {
      sampleCount: 0,
      uniqueBoostActors: 0,
      boostUsed: 0,
      boostCollectedApprox: 0,
      bpm: 0,
      averageBoost: 0,
      minBoost: 0,
      maxBoost: 0,
      zeroBoostSeconds: 0,
      fullBoostSeconds: 0,
      boost0To25Pct: 0,
      boost25To50Pct: 0,
      boost50To75Pct: 0,
      boost75To100Pct: 0,
      boost0To25Seconds: 0,
      boost25To50Seconds: 0,
      boost50To75Seconds: 0,
      boost75To100Seconds: 0,
      boostUsedWhileSupersonic: 0,
    };
  }

  const normalized = samples
    .map((sample) => ({
      ...sample,
      boost: normalizeBoost(sample.rawBoost, maxRawValue),
    }))
    .filter((sample) => sample.boost !== null)
    .sort((a, b) => a.time - b.time);
  const sortedSpeedSamples = [...speedSamples].sort((a, b) => a.time - b.time);
  const speedCursor = { index: 0 };

  let boostUsed = 0;
  let boostCollectedApprox = 0;
  let boostUsedWhileSupersonic = 0;

  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1];
    const curr = normalized[i];

    // Do not compare boost across different boost actors.
    if (prev.boostActorId !== curr.boostActorId) continue;

    const diff = curr.boost - prev.boost;

    if (diff < 0) {
      const used = Math.abs(diff);
      const speed = getSpeedAtTime(sortedSpeedSamples, curr.time, speedCursor);

      boostUsed += used;
      if (speed !== null && speed >= SUPERSONIC_THRESHOLD) {
        boostUsedWhileSupersonic += used;
      }
    }
    if (diff > 0) boostCollectedApprox += diff;
  }

  const durationSeconds = Math.max(1, matchEnd - matchStart);
  const durationMinutes = durationSeconds / 60;

  const boostValues = normalized.map((sample) => sample.boost);

  let weightedTotal = 0;
  let totalTime = 0;
  let zeroBoostSeconds = 0;
  let fullBoostSeconds = 0;
  const bandSeconds = {
    boost0To25Seconds: 0,
    boost25To50Seconds: 0,
    boost50To75Seconds: 0,
    boost75To100Seconds: 0,
  };

  for (let i = 0; i < normalized.length; i++) {
    const current = normalized[i];
    const next = normalized[i + 1];

    const start = Math.max(current.time, matchStart);
    const end = Math.min(next ? next.time : matchEnd, matchEnd);
    const duration = Math.max(0, end - start);

    weightedTotal += current.boost * duration;
    totalTime += duration;

    if (current.boost <= 1) zeroBoostSeconds += duration;
    if (current.boost >= 99) fullBoostSeconds += duration;

    if (current.boost < 25) bandSeconds.boost0To25Seconds += duration;
    else if (current.boost < 50) bandSeconds.boost25To50Seconds += duration;
    else if (current.boost < 75) bandSeconds.boost50To75Seconds += duration;
    else bandSeconds.boost75To100Seconds += duration;
  }

  const bandPct = (seconds) =>
    totalTime > 0 ? Number(((seconds / totalTime) * 100).toFixed(2)) : 0;

  return {
    sampleCount: normalized.length,
    uniqueBoostActors: new Set(normalized.map((sample) => sample.boostActorId))
      .size,
    boostUsed: Number(boostUsed.toFixed(2)),
    boostCollectedApprox: Number(boostCollectedApprox.toFixed(2)),
    bpm: Number((boostUsed / durationMinutes).toFixed(2)),
    averageBoost:
      totalTime > 0 ? Number((weightedTotal / totalTime).toFixed(2)) : 0,
    minBoost: Number(Math.min(...boostValues).toFixed(2)),
    maxBoost: Number(Math.max(...boostValues).toFixed(2)),
    zeroBoostSeconds: Number(zeroBoostSeconds.toFixed(2)),
    fullBoostSeconds: Number(fullBoostSeconds.toFixed(2)),
    boost0To25Seconds: Number(bandSeconds.boost0To25Seconds.toFixed(2)),
    boost25To50Seconds: Number(bandSeconds.boost25To50Seconds.toFixed(2)),
    boost50To75Seconds: Number(bandSeconds.boost50To75Seconds.toFixed(2)),
    boost75To100Seconds: Number(bandSeconds.boost75To100Seconds.toFixed(2)),
    boost0To25Pct: bandPct(bandSeconds.boost0To25Seconds),
    boost25To50Pct: bandPct(bandSeconds.boost25To50Seconds),
    boost50To75Pct: bandPct(bandSeconds.boost50To75Seconds),
    boost75To100Pct: bandPct(bandSeconds.boost75To100Seconds),
    boostUsedWhileSupersonic: Number(boostUsedWhileSupersonic.toFixed(2)),
  };
}

export function extractBoostStatsV2(replay) {
  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];

  const headerPlayers = replay.properties?.PlayerStats ?? [];
  const headerPlayersByName = new Map(headerPlayers.map((p) => [p.Name, p]));

  const activeActors = new Map();
  const priInfo = new Map();
  const teamActorToIndex = new Map();
  const carToPri = new Map();
  const boostToCar = new Map();
  const samplesByPri = new Map();
  const speedSamplesByPri = new Map();

  const actorCounts = {
    priActors: 0,
    carActors: 0,
    boostActors: 0,
  };

  function ensurePri(priActorId) {
    if (!priInfo.has(priActorId)) {
      priInfo.set(priActorId, {
        priActorId,
        name: null,
        team: null,
        teamActorId: null,
      });
    }

    if (!samplesByPri.has(priActorId)) {
      samplesByPri.set(priActorId, []);
    }

    if (!speedSamplesByPri.has(priActorId)) {
      speedSamplesByPri.set(priActorId, []);
    }

    return priInfo.get(priActorId);
  }

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const time = frame.time ?? frameIndex;

    for (const actor of frame.new_actors ?? []) {
      const actorId = getActorId(actor);
      if (actorId === null) continue;

      const objectName = getObjectName(actor, objects, names);

      activeActors.set(actorId, {
        actorId,
        objectName,
        firstSeenFrame: frameIndex,
        firstSeenTime: time,
      });

      if (objectName === PRI_OBJECT_NAME) {
        actorCounts.priActors++;
        ensurePri(actorId);
      } else if (objectName === CAR_OBJECT_NAME) {
        actorCounts.carActors++;
      } else if (objectName === BOOST_OBJECT_NAME) {
        actorCounts.boostActors++;
      }
    }

    // First pass: update mapping links for this frame.
    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;

      const activeActor = activeActors.get(actorId);
      if (!activeActor) continue;

      const activeObjectName = activeActor.objectName;
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (updateObjectName === "Engine.TeamInfo:TeamIndex") {
        const nums = findNumbers(attribute);
        const teamIndex = nums.find((n) => n === 0 || n === 1);

        if (teamIndex !== undefined) {
          teamActorToIndex.set(actorId, teamIndex);
        }
      }

      if (activeObjectName === PRI_OBJECT_NAME) {
        const info = ensurePri(actorId);

        if (updateObjectName === "Engine.PlayerReplicationInfo:PlayerName") {
          const strings = findStrings(attribute);

          const matchedName =
            strings.find((s) => headerPlayersByName.has(s)) ??
            strings.find((s) => s.length > 1 && s.length <= 40);

          if (matchedName) info.name = matchedName;
        }

        if (updateObjectName === "Engine.PlayerReplicationInfo:Team") {
          const nums = findNumbers(attribute);
          const teamActorRef = getActiveTeamActorId(nums, activeActors);

          if (teamActorRef !== undefined) {
            info.teamActorId = teamActorRef;
            info.team = teamActorToIndex.get(teamActorRef) ?? null;
          }

          const directTeam = nums.find((n) => n === 0 || n === 1);

          if (info.team === null && directTeam !== undefined) {
            info.team = directTeam;
          }
        }
      }

      if (
        activeObjectName === CAR_OBJECT_NAME &&
        updateObjectName === "Engine.Pawn:PlayerReplicationInfo"
      ) {
        const nums = findNumbers(attribute);
        const priRef = getActiveActorId(nums, activeActors, PRI_OBJECT_NAME);

        if (priRef !== undefined) {
          ensurePri(priRef);
          carToPri.set(actorId, priRef);
        }
      }

      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === RIGID_BODY_STATE) {
        const priActorId = carToPri.get(actorId);
        const speed = velocityMagnitude(update.attribute?.RigidBody?.linear_velocity);

        if (priActorId !== undefined && speed !== null) {
          ensurePri(priActorId);
          speedSamplesByPri.get(priActorId).push({
            frameIndex,
            time,
            carActorId: actorId,
            speed,
          });
        }
      }

      if (
        activeObjectName === BOOST_OBJECT_NAME &&
        updateObjectName === "TAGame.CarComponent_TA:Vehicle"
      ) {
        const nums = findNumbers(attribute);
        const carRef = getActiveActorId(nums, activeActors, CAR_OBJECT_NAME);

        if (carRef !== undefined) {
          boostToCar.set(actorId, carRef);
        }
      }
    }

    // Second pass: collect boost values after mappings are updated.
    for (const update of frame.updated_actors ?? []) {
      const boostActorId = getActorId(update);
      if (boostActorId === null) continue;

      const activeActor = activeActors.get(boostActorId);
      if (activeActor?.objectName !== BOOST_OBJECT_NAME) continue;

      const updateObjectName = getObjectName(update, objects, names);
      if (updateObjectName !== "TAGame.CarComponent_Boost_TA:ReplicatedBoost")
        continue;

      const carActorId = boostToCar.get(boostActorId);
      if (carActorId === undefined) continue;

      const priActorId = carToPri.get(carActorId);
      if (priActorId === undefined) continue;

      const rawBoost = extractRawBoostValue(update.attribute);
      if (rawBoost === null) continue;

      ensurePri(priActorId);

      samplesByPri.get(priActorId).push({
        frameIndex,
        time,
        priActorId,
        carActorId,
        boostActorId,
        rawBoost,
      });
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId =
        typeof deleted === "number" ? deleted : getActorId(deleted);

      if (deletedId === null || deletedId === undefined) continue;

      const activeActor = activeActors.get(deletedId);

      if (activeActor?.objectName === CAR_OBJECT_NAME) {
        carToPri.delete(deletedId);

        for (const [boostActorId, carActorId] of boostToCar.entries()) {
          if (carActorId === deletedId) {
            boostToCar.delete(boostActorId);
          }
        }
      } else if (activeActor?.objectName === BOOST_OBJECT_NAME) {
        boostToCar.delete(deletedId);
      } else if (activeActor?.objectName === PRI_OBJECT_NAME) {
        for (const [carActorId, priActorId] of carToPri.entries()) {
          if (priActorId === deletedId) {
            carToPri.delete(carActorId);
          }
        }
      }

      activeActors.delete(deletedId);
    }
  }

  // Reconcile censored network actors with unmatched header players by elimination.
  {
    const matchedHeaderNames = new Set(
      [...priInfo.values()]
        .map((i) => i.name)
        .filter((n) => n !== null && headerPlayersByName.has(n)),
    );
    const unmatchedHeaderPlayers = headerPlayers.filter(
      (p) => !matchedHeaderNames.has(p.Name),
    );
    const censoredActors = [...priInfo.values()].filter(
      (i) => i.name !== null && !headerPlayersByName.has(i.name),
    );

    if (unmatchedHeaderPlayers.length === 1 && censoredActors.length === 1) {
      censoredActors[0].name = unmatchedHeaderPlayers[0].Name;
    } else if (unmatchedHeaderPlayers.length > 1 && censoredActors.length > 0) {
      const assigned = new Set();
      for (const actor of censoredActors) {
        const actorTeam =
          actor.team ??
          (actor.teamActorId !== null
            ? (teamActorToIndex.get(actor.teamActorId) ?? null)
            : null);
        if (actorTeam === null) continue;
        const candidates = unmatchedHeaderPlayers.filter(
          (p) => p.Team === actorTeam && !assigned.has(p.Name),
        );
        if (candidates.length === 1) {
          actor.name = candidates[0].Name;
          assigned.add(candidates[0].Name);
        }
      }
    }
  }

  const allRawBoostValues = [...samplesByPri.values()]
    .flat()
    .map((sample) => sample.rawBoost);

  const maxRawValue = allRawBoostValues.length
    ? Math.max(...allRawBoostValues)
    : 100;

  const frameTimes = frames
    .map((frame) => frame.time)
    .filter((time) => typeof time === "number");

  const matchStart = frameTimes.length ? Math.min(...frameTimes) : 0;
  const matchEnd = frameTimes.length
    ? Math.max(...frameTimes)
    : (replay.properties?.TotalSecondsPlayed ?? 0);

  const players = [...priInfo.keys()]
    .sort((a, b) => a - b)
    .map((priActorId) => {
      const info = priInfo.get(priActorId);
      const header = info?.name ? headerPlayersByName.get(info.name) : null;

      const samples = samplesByPri.get(priActorId) ?? [];
      const speedSamples = speedSamplesByPri.get(priActorId) ?? [];
      const boostStats = calculateBoostStats(
        samples,
        speedSamples,
        matchStart,
        matchEnd,
        maxRawValue,
      );

      return {
        playerName: info?.name ?? "UNKNOWN",
        team:
          header?.Team ??
          info?.team ??
          (info?.teamActorId !== null
            ? (teamActorToIndex.get(info.teamActorId) ?? null)
            : null),
        score: header?.Score ?? 0,
        goals: header?.Goals ?? 0,
        assists: header?.Assists ?? 0,
        saves: header?.Saves ?? 0,
        shots: header?.Shots ?? 0,
        priActorId,
        ...boostStats,
      };
    });

  // Header-only fallback: no network actors.
  if (players.length === 0 && headerPlayers.length > 0) {
    const emptyBoostStats = calculateBoostStats([], [], matchStart, matchEnd, 100);
    for (const player of headerPlayers) {
      players.push({
        playerName: player.Name,
        team: player.Team ?? null,
        score: player.Score ?? 0,
        goals: player.Goals ?? 0,
        assists: player.Assists ?? 0,
        saves: player.Saves ?? 0,
        shots: player.Shots ?? 0,
        priActorId: null,
        ...emptyBoostStats,
      });
    }
  }

  return {
    replayName: replay.properties?.ReplayName ?? null,
    replayId: replay.properties?.Id ?? null,
    mapName: replay.properties?.MapName ?? null,
    matchStart,
    matchEnd,
    matchDurationSeconds: Number((matchEnd - matchStart).toFixed(2)),
    rawBoostEncoding:
      maxRawValue > 100 ? "0-255 converted to 0-100" : "already 0-100",
    actorCounts,
    players,
  };
}

async function main() {
  const replayBuffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(replayBuffer);
  const output = extractBoostStatsV2(replay);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log("\nBoost stats V2:");
  console.table(
    output.players.map((player) => ({
      Player: player.playerName,
      Team: player.team,
      Samples: player.sampleCount,
      "Boost Actors": player.uniqueBoostActors,
      "Boost Used": player.boostUsed,
      "Collected Approx": player.boostCollectedApprox,
      BPM: player.bpm,
      "Avg Boost": player.averageBoost,
      "0 Boost Time": player.zeroBoostSeconds,
      "100 Boost Time": player.fullBoostSeconds,
      "0-25 %": player.boost0To25Pct,
      "25-50 %": player.boost25To50Pct,
      "50-75 %": player.boost50To75Pct,
      "75-100 %": player.boost75To100Pct,
      "Used Supersonic": player.boostUsedWhileSupersonic,
      Min: player.minBoost,
      Max: player.maxBoost,
    })),
  );

  console.log("\nActor counts:");
  console.table(output.actorCounts);

  console.log(`\nSaved boost stats to: ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to extract boost stats V2:");
    console.error(error);
    process.exit(1);
  });
}
