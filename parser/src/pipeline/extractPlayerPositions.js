import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = process.cwd();
const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "player-position-timeline.json");

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const CAR_OBJECT_NAME = "Archetypes.Car.Car_Default";
const BOOST_OBJECT_NAME = "Archetypes.CarComponents.CarComponent_Boost";
const BOOST_UPDATE_NAME = "TAGame.CarComponent_Boost_TA:ReplicatedBoost";
const BOOST_VEHICLE_LINK = "TAGame.CarComponent_TA:Vehicle";
const THROTTLE_UPDATE_NAMES = new Set([
  "TAGame.Vehicle_TA:ReplicatedThrottle",
  "TAGame.Car_TA:ReplicatedThrottle",
]);

function extractThrottleByte(attribute) {
  const raw = attribute?.Byte ?? attribute?.Throttle ?? findNumbers(attribute)[0];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < 0 || raw > 255) return null;
  return Math.round(raw);
}

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

function isTeamActorObject(objectName) {
  return (
    objectName === "Engine.TeamInfo" ||
    objectName === "TAGame.Team_TA" ||
    objectName.endsWith(".Team_TA")
  );
}

function getActiveTeamActorId(numbers, activeActors) {
  return numbers.find((number) =>
    isTeamActorObject(activeActors.get(number)?.objectName ?? ""),
  );
}

function getActiveActorId(numbers, activeActors, objectName) {
  return numbers.find(
    (number) => activeActors.get(number)?.objectName === objectName,
  );
}

function extractRawBoostValue(attribute) {
  const boostAmount = attribute?.ReplicatedBoost?.boost_amount;

  if (typeof boostAmount !== "number") return null;
  if (boostAmount < 0 || boostAmount > 255) return null;

  return boostAmount;
}

function getRigidBodyLocation(attribute) {
  const location = attribute?.RigidBody?.location;

  if (
    location &&
    typeof location.x === "number" &&
    typeof location.y === "number" &&
    typeof location.z === "number"
  ) {
    return location;
  }

  return null;
}

function hasVector3(value) {
  return (
    value &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.z === "number"
  );
}

function hasQuaternion(value) {
  return hasVector3(value) && typeof value.w === "number";
}

function round(value, decimals = 2) {
  if (typeof value !== "number") return null;
  return Number(value.toFixed(decimals));
}

export function extractPlayerPositions(replay) {
  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];
  const headerPlayers = replay.properties?.PlayerStats ?? [];
  const headerPlayersByName = new Map(headerPlayers.map((p) => [p.Name, p]));

  const activeActors = new Map();
  const priInfo = new Map();
  const carToPri = new Map();
  const teamActorToIndex = new Map();
  const samplesByPri = new Map();
  const boostToCar = new Map();
  const boostByCar = new Map();
  const throttleByCar = new Map();

  const frameTimes = frames
    .map((frame) => frame.time)
    .filter((time) => typeof time === "number");
  const firstFrameTime = frameTimes.length ? Math.min(...frameTimes) : 0;

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

    return priInfo.get(priActorId);
  }

  function resolvePlayer(priActorId) {
    const info = priInfo.get(priActorId);
    const header = info?.name ? headerPlayersByName.get(info.name) : null;

    return {
      playerName: info?.name ?? `UNKNOWN_PRI_${priActorId}`,
      team:
        header?.Team ??
        info?.team ??
        (info?.teamActorId !== null && info?.teamActorId !== undefined
          ? (teamActorToIndex.get(info.teamActorId) ?? null)
          : null),
    };
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
      });

      if (objectName === PRI_OBJECT_NAME) {
        ensurePri(actorId);
      }
    }

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
        const teamIndex = nums.find((num) => num === 0 || num === 1);

        if (teamIndex !== undefined) {
          teamActorToIndex.set(actorId, teamIndex);
        }
      }

      if (activeObjectName === PRI_OBJECT_NAME) {
        const info = ensurePri(actorId);

        if (updateObjectName === "Engine.PlayerReplicationInfo:PlayerName") {
          const strings = findStrings(attribute);
          const matchedName =
            strings.find((value) => headerPlayersByName.has(value)) ??
            strings.find((value) => value.length > 1 && value.length <= 40);

          if (matchedName) info.name = matchedName;
        }

        if (updateObjectName === "Engine.PlayerReplicationInfo:Team") {
          const nums = findNumbers(attribute);
          const teamActorId = getActiveTeamActorId(nums, activeActors);

          if (teamActorId !== undefined) {
            info.teamActorId = teamActorId;
            info.team = teamActorToIndex.get(teamActorId) ?? null;
          }

          const directTeam = nums.find((num) => num === 0 || num === 1);

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

      if (
        activeObjectName === BOOST_OBJECT_NAME &&
        updateObjectName === BOOST_VEHICLE_LINK
      ) {
        const nums = findNumbers(attribute);
        const carRef = getActiveActorId(nums, activeActors, CAR_OBJECT_NAME);

        if (carRef !== undefined) {
          boostToCar.set(actorId, carRef);
        }
      }

      if (
        activeObjectName === CAR_OBJECT_NAME &&
        THROTTLE_UPDATE_NAMES.has(updateObjectName)
      ) {
        const throttle = extractThrottleByte(attribute);
        if (throttle !== null) throttleByCar.set(actorId, throttle);
      }
    }

    // Boost lives on CarComponent_Boost actors, not the car body.
    for (const update of frame.updated_actors ?? []) {
      const boostActorId = getActorId(update);
      if (boostActorId === null) continue;

      const activeActor = activeActors.get(boostActorId);
      if (activeActor?.objectName !== BOOST_OBJECT_NAME) continue;

      const updateObjectName = getObjectName(update, objects, names);
      if (updateObjectName !== BOOST_UPDATE_NAME) continue;

      const carActorId = boostToCar.get(boostActorId);
      if (carActorId === undefined) continue;

      const rawBoost = extractRawBoostValue(update.attribute);
      if (rawBoost === null) continue;

      boostByCar.set(carActorId, rawBoost);
    }

    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;

      const activeActor = activeActors.get(actorId);
      if (!activeActor) continue;

      const activeObjectName = activeActor.objectName;
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (
        activeObjectName === CAR_OBJECT_NAME &&
        updateObjectName === "TAGame.RBActor_TA:ReplicatedRBState"
      ) {
        const priActorId = carToPri.get(actorId);
        const rb = attribute?.RigidBody;
        const location = getRigidBodyLocation(attribute);

        if (priActorId !== undefined && location) {
          ensurePri(priActorId);

          const sample = {
            frameIndex,
            time: round(time, 3),
            elapsedSeconds: round(time - firstFrameTime, 3),
            carActorId: actorId,
            x: round(location.x),
            y: round(location.y),
            z: round(location.z),
          };

          if (hasQuaternion(rb?.rotation)) {
            sample.qx = round(rb.rotation.x, 6);
            sample.qy = round(rb.rotation.y, 6);
            sample.qz = round(rb.rotation.z, 6);
            sample.qw = round(rb.rotation.w, 6);
          }

          if (hasVector3(rb?.linear_velocity)) {
            sample.vx = round(rb.linear_velocity.x);
            sample.vy = round(rb.linear_velocity.y);
            sample.vz = round(rb.linear_velocity.z);
          }

          const boost = boostByCar.get(actorId);
          if (typeof boost === "number") sample.boostAmount = boost;

          const throttle = throttleByCar.get(actorId);
          if (typeof throttle === "number") sample.throttle = throttle;

          samplesByPri.get(priActorId).push(sample);
        }
      }
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId =
        typeof deleted === "number" ? deleted : getActorId(deleted);

      if (deletedId === null || deletedId === undefined) continue;

      const activeActor = activeActors.get(deletedId);

      if (activeActor?.objectName === CAR_OBJECT_NAME) {
        carToPri.delete(deletedId);
        boostByCar.delete(deletedId);
        throttleByCar.delete(deletedId);

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

  const players = [...priInfo.keys()]
    .sort((a, b) => a - b)
    .map((priActorId) => {
      const { playerName, team } = resolvePlayer(priActorId);
      const samples = samplesByPri.get(priActorId) ?? [];

      return {
        playerName,
        team,
        priActorId,
        sampleCount: samples.length,
        samples,
      };
    })
    .filter((player) => player.sampleCount > 0);

  return {
    replayName: replay.properties?.ReplayName ?? null,
    replayId: replay.properties?.Id ?? null,
    mapName: replay.properties?.MapName ?? null,
    fieldBounds: {
      minX: -4096,
      maxX: 4096,
      minY: -5120,
      maxY: 5120,
    },
    notes: [
      "Player positions are extracted from active car ReplicatedRBState updates.",
      "Field bounds use standard Rocket League field coordinates for the first 2D heatmap pass.",
    ],
    playerCount: players.length,
    players,
  };
}

async function main() {
  const replayBuffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(replayBuffer);
  const output = extractPlayerPositions(replay);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log("\nPlayer position samples:");
  console.table(
    output.players.map((player) => ({
      Player: player.playerName,
      Team: player.team,
      Samples: player.sampleCount,
    })),
  );

  console.log(`\nSaved player position timeline to: ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to extract player positions:");
    console.error(error);
    process.exit(1);
  });
}
