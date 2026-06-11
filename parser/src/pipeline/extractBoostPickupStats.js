import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = process.cwd();

const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "boost-pickup-stats-v2.json");

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
  if (typeof item === "object") return item.name ?? item.Name ?? item.value ?? JSON.stringify(item);
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

function isTeamActorObject(objectName) {
  return (
    objectName === "Engine.TeamInfo" ||
    objectName === "TAGame.Team_TA" ||
    objectName.endsWith(".Team_TA")
  );
}

function getActiveActorId(numbers, activeActors, objectName) {
  return numbers.find((number) => activeActors.get(number)?.objectName === objectName);
}

function getActiveTeamActorId(numbers, activeActors) {
  return numbers.find((number) =>
    isTeamActorObject(activeActors.get(number)?.objectName ?? ""),
  );
}

function findStrings(value, result = []) {
  if (value === null || value === undefined) return result;
  if (typeof value === "string") { result.push(value); return result; }
  if (Array.isArray(value)) { for (const item of value) findStrings(item, result); return result; }
  if (typeof value === "object") { for (const child of Object.values(value)) findStrings(child, result); }
  return result;
}

function findNumbers(value, result = []) {
  if (value === null || value === undefined) return result;
  if (typeof value === "number") { result.push(value); return result; }
  if (Array.isArray(value)) { for (const item of value) findNumbers(item, result); return result; }
  if (typeof value === "object") { for (const child of Object.values(value)) findNumbers(child, result); }
  return result;
}

function getLocationFromTrajectory(actor) {
  return actor?.initial_trajectory?.location ?? null;
}

function getLocationFromRigidBody(attribute) {
  const location = attribute?.RigidBody?.location;
  if (location && typeof location.x === "number" && typeof location.y === "number" && typeof location.z === "number") {
    return location;
  }
  return null;
}

function normalizeBoost(rawBoost) {
  if (typeof rawBoost !== "number") return null;
  return Number(((rawBoost / 255) * 100).toFixed(2));
}

function estimateBoostGain(samples, eventTime, maxRawBoost) {
  const nearby = samples.filter((sample) => Math.abs(sample.time - eventTime) <= 0.75);
  if (nearby.length < 2) return null;
  const rawValues = nearby.map((sample) => sample.rawBoost);
  const minRaw = Math.min(...rawValues);
  const maxRaw = Math.max(...rawValues);
  const gainRaw = maxRaw - minRaw;
  if (gainRaw <= 0) return 0;
  if (maxRawBoost > 100) return normalizeBoost(gainRaw);
  return Number(gainRaw.toFixed(2));
}

function classifyPadByGain(boostGain) {
  if (boostGain === null || boostGain === undefined) return "unknown";
  if (boostGain >= 30) return "big";
  if (boostGain > 0) return "small";
  return "unknown";
}

function classifyPadFromActorHistory(eventsForActor) {
  const gains = eventsForActor
    .map((event) => event.estimatedBoostGain)
    .filter((gain) => typeof gain === "number" && gain > 0);
  if (gains.length === 0) return "unknown";
  const maxGain = Math.max(...gains);
  if (maxGain >= 30) return "big";
  return "small";
}

function getNearestPreviousLocation(samples, time) {
  if (!samples || samples.length === 0) return null;
  let best = null;
  for (const sample of samples) {
    if (sample.time <= time) best = sample;
    else break;
  }
  return best?.location ?? null;
}

function isStolenBoost(team, carLocation) {
  if (!carLocation || typeof carLocation.y !== "number") return false;
  const neutralZoneY = 1000;
  if (Math.abs(carLocation.y) < neutralZoneY) return false;
  if (team === 0) return carLocation.y > neutralZoneY;
  if (team === 1) return carLocation.y < -neutralZoneY;
  return false;
}

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const CAR_OBJECT_NAME = "Archetypes.Car.Car_Default";
const BOOST_OBJECT_NAME = "Archetypes.CarComponents.CarComponent_Boost";

export function extractBoostPickups(replay) {
  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];
  const headerPlayers = replay.properties?.PlayerStats ?? [];
  const headerPlayersByName = new Map(headerPlayers.map((p) => [p.Name, p]));

  const activeActors = new Map();
  const teamActorToIndex = new Map();
  const priInfo = new Map();
  const carToPri = new Map();
  const boostToCar = new Map();
  const boostSamplesByPri = new Map();
  const carLocationSamples = new Map();
  const pickupEvents = [];
  const seenPickupEvents = new Set();

  function ensurePri(priActorId) {
    if (!priInfo.has(priActorId)) {
      priInfo.set(priActorId, { priActorId, name: null, team: null, teamActorId: null });
    }
    if (!boostSamplesByPri.has(priActorId)) {
      boostSamplesByPri.set(priActorId, []);
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
        actorId, objectName, firstSeenFrame: frameIndex, firstSeenTime: time,
        location: getLocationFromTrajectory(actor), raw: actor,
      });
      if (objectName === PRI_OBJECT_NAME) ensurePri(actorId);
      if (objectName === CAR_OBJECT_NAME) {
        if (!carLocationSamples.has(actorId)) carLocationSamples.set(actorId, []);
      }
    }

    // First pass: update links, boost samples, and car location samples.
    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;
      const activeActor = activeActors.get(actorId);
      const activeObjectName = activeActor?.objectName ?? "unknown";
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (updateObjectName === "Engine.TeamInfo:TeamIndex") {
        const nums = findNumbers(attribute);
        const teamIndex = nums.find((n) => n === 0 || n === 1);
        if (teamIndex !== undefined) teamActorToIndex.set(actorId, teamIndex);
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
          if (info.team === null && directTeam !== undefined) info.team = directTeam;
        }
      }

      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === "Engine.Pawn:PlayerReplicationInfo") {
        const nums = findNumbers(attribute);
        const priRef = getActiveActorId(nums, activeActors, PRI_OBJECT_NAME);
        if (priRef !== undefined) {
          ensurePri(priRef);
          carToPri.set(actorId, priRef);
        }
      }

      if (activeObjectName === BOOST_OBJECT_NAME && updateObjectName === "TAGame.CarComponent_TA:Vehicle") {
        const nums = findNumbers(attribute);
        const carRef = getActiveActorId(nums, activeActors, CAR_OBJECT_NAME);
        if (carRef !== undefined) boostToCar.set(actorId, carRef);
      }

      if (activeObjectName === BOOST_OBJECT_NAME && updateObjectName === "TAGame.CarComponent_Boost_TA:ReplicatedBoost") {
        const carActorId = boostToCar.get(actorId);
        const priActorId = carActorId !== undefined ? carToPri.get(carActorId) : undefined;
        const rawBoost = attribute?.ReplicatedBoost?.boost_amount;
        if (priActorId !== undefined && typeof rawBoost === "number" && rawBoost >= 0 && rawBoost <= 255) {
          ensurePri(priActorId);
          boostSamplesByPri.get(priActorId).push({
            frameIndex, time, priActorId, carActorId, boostActorId: actorId,
            rawBoost, boost: normalizeBoost(rawBoost),
          });
        }
      }

      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === "TAGame.RBActor_TA:ReplicatedRBState") {
        const location = getLocationFromRigidBody(attribute);
        if (location) {
          if (!carLocationSamples.has(actorId)) carLocationSamples.set(actorId, []);
          carLocationSamples.get(actorId).push({ frameIndex, time, location });
        }
      }

      if (activeObjectName.includes("VehiclePickup_Boost_TA") && updateObjectName === "TAGame.RBActor_TA:ReplicatedRBState") {
        const location = getLocationFromRigidBody(attribute);
        if (location && activeActor) activeActor.location = location;
      }
    }

    // Second pass: extract boost pickup events after mappings are updated.
    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;
      const activeActor = activeActors.get(actorId);
      const activeObjectName = activeActor?.objectName ?? "unknown";
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (!activeObjectName.includes("VehiclePickup_Boost_TA")) continue;
      if (updateObjectName !== "TAGame.VehiclePickup_TA:NewReplicatedPickupData") continue;

      const pickupNew = attribute?.PickupNew;
      if (!pickupNew) continue;

      const instigatorCarActorId = pickupNew.instigator;
      const pickedUpState = pickupNew.picked_up;
      if (typeof instigatorCarActorId !== "number") continue;

      const priActorId = carToPri.get(instigatorCarActorId);
      if (priActorId === undefined) continue;

      const eventKey = `${actorId}|${instigatorCarActorId}|${pickedUpState}`;
      if (seenPickupEvents.has(eventKey)) continue;
      seenPickupEvents.add(eventKey);

      pickupEvents.push({
        frameIndex, time, pickupActorId: actorId, pickupObjectName: activeObjectName,
        instigatorCarActorId, priActorId, pickedUpState, location: activeActor.location ?? null,
      });
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId = typeof deleted === "number" ? deleted : getActorId(deleted);
      if (deletedId !== null && deletedId !== undefined) {
        const activeActor = activeActors.get(deletedId);
        if (activeActor?.objectName === CAR_OBJECT_NAME) {
          carToPri.delete(deletedId);
          for (const [boostActorId, carActorId] of boostToCar.entries()) {
            if (carActorId === deletedId) boostToCar.delete(boostActorId);
          }
        } else if (activeActor?.objectName === BOOST_OBJECT_NAME) {
          boostToCar.delete(deletedId);
        } else if (activeActor?.objectName === PRI_OBJECT_NAME) {
          for (const [carActorId, priActorId] of carToPri.entries()) {
            if (priActorId === deletedId) carToPri.delete(carActorId);
          }
        }
        activeActors.delete(deletedId);
      }
    }
  }

  for (const samples of carLocationSamples.values()) {
    samples.sort((a, b) => a.time - b.time);
  }

  const globalMaxRawBoost = Math.max(
    0,
    ...[...boostSamplesByPri.values()].flat().map((s) => s.rawBoost),
  );

  const enrichedEvents = pickupEvents.map((event) => {
    const info = priInfo.get(event.priActorId);
    const header = info?.name ? headerPlayersByName.get(info.name) : null;
    const playerTeam =
      header?.Team ??
      info?.team ??
      (info?.teamActorId !== null ? (teamActorToIndex.get(info.teamActorId) ?? null) : null);
    const playerName = info?.name ?? "UNKNOWN";
    const samples = boostSamplesByPri.get(event.priActorId) ?? [];
    const estimatedBoostGain = estimateBoostGain(samples, event.time, globalMaxRawBoost);
    const padType = classifyPadByGain(estimatedBoostGain);
    return {
      ...event, playerName, team: playerTeam, estimatedBoostGain, padType,
      isStolen: isStolenBoost(playerTeam, event.location),
    };
  });

  const eventsByPickupActor = new Map();
  for (const event of enrichedEvents) {
    if (!eventsByPickupActor.has(event.pickupActorId)) eventsByPickupActor.set(event.pickupActorId, []);
    eventsByPickupActor.get(event.pickupActorId).push(event);
  }
  const padTypeByPickupActor = new Map();
  for (const [pickupActorId, actorEvents] of eventsByPickupActor.entries()) {
    padTypeByPickupActor.set(pickupActorId, classifyPadFromActorHistory(actorEvents));
  }

  const refinedEvents = enrichedEvents.map((event) => {
    const carSamples = carLocationSamples.get(event.instigatorCarActorId) ?? [];
    const carLocationAtPickup = getNearestPreviousLocation(carSamples, event.time);
    const refinedPadType = padTypeByPickupActor.get(event.pickupActorId) ?? event.padType ?? "unknown";
    return {
      ...event,
      location: event.location ?? carLocationAtPickup,
      carLocationAtPickup,
      padType: refinedPadType,
      isStolen: isStolenBoost(event.team, carLocationAtPickup),
    };
  });

  const byPlayer = new Map();
  for (const player of headerPlayers) {
    byPlayer.set(player.Name, {
      playerName: player.Name, team: player.Team, score: player.Score,
      goals: player.Goals, assists: player.Assists, saves: player.Saves, shots: player.Shots,
      pickups: 0, bigPads: 0, smallPads: 0, unknownPads: 0, boostStolen: 0, boostCollectedActualGain: 0,
    });
  }
  for (const event of refinedEvents) {
    if (!byPlayer.has(event.playerName)) {
      byPlayer.set(event.playerName, {
        playerName: event.playerName, team: event.team,
        score: 0, goals: 0, assists: 0, saves: 0, shots: 0,
        pickups: 0, bigPads: 0, smallPads: 0, unknownPads: 0, boostStolen: 0, boostCollectedActualGain: 0,
      });
    }
    const row = byPlayer.get(event.playerName);
    row.pickups++;
    if (event.padType === "big") row.bigPads++;
    else if (event.padType === "small") row.smallPads++;
    else row.unknownPads++;
    if (event.isStolen) row.boostStolen++;
    if (typeof event.estimatedBoostGain === "number") row.boostCollectedActualGain += event.estimatedBoostGain;
  }

  const players = [...byPlayer.values()].map((player) => ({
    ...player,
    boostCollectedActualGain: Number(player.boostCollectedActualGain.toFixed(2)),
    boostCollectedTheoreticalEstimate: Number(
      (player.bigPads * 100 + player.smallPads * 12).toFixed(2),
    ),
  }));

  return {
    replayName: replay.properties?.ReplayName ?? null,
    replayId: replay.properties?.Id ?? null,
    mapName: replay.properties?.MapName ?? null,
    notes: [
      "V2 refines stolen boost by using the instigator car location at pickup time.",
      "V2 refines big/small pad type by looking at each pickup actor's maximum visible boost gain.",
      "Big/small pad type is still an estimate until pad actor IDs are mapped to official map pad locations.",
    ],
    playerCount: players.length,
    eventCount: refinedEvents.length,
    players,
    events: refinedEvents,
  };
}

async function main() {
  const buffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(buffer);
  const output = extractBoostPickups(replay);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log("\nBoost pickup stats V2:");
  console.table(
    output.players.map((player) => ({
      Player: player.playerName,
      Team: player.team,
      Pickups: player.pickups,
      Big: player.bigPads,
      Small: player.smallPads,
      Unknown: player.unknownPads,
      Stolen: player.boostStolen,
      "Actual Gain": player.boostCollectedActualGain,
      "Theoretical Estimate": player.boostCollectedTheoreticalEstimate,
    })),
  );

  console.log(`\nEvents detected: ${output.eventCount}`);
  console.log(`Saved boost pickup stats to: ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to extract boost pickup stats:");
    console.error(error);
    process.exit(1);
  });
}
