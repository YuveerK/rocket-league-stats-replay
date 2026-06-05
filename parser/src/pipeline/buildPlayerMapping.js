import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "player-mapping.json");

function readJsonFileSafe(buffer) {
  let raw;

  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    raw = buffer.toString("utf16le");
  } else {
    raw = buffer.toString("utf8");
  }

  raw = raw.replace(/^\uFEFF/, "").trim();
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

function findStrings(value, result = []) {
  if (value === null || value === undefined) return result;

  if (typeof value === "string") {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findStrings(item, result);
    }
    return result;
  }

  if (typeof value === "object") {
    for (const child of Object.values(value)) {
      findStrings(child, result);
    }
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
    for (const item of value) {
      findNumbers(item, result);
    }
    return result;
  }

  if (typeof value === "object") {
    for (const child of Object.values(value)) {
      findNumbers(child, result);
    }
  }

  return result;
}

function getActorId(item) {
  return item.actor_id ?? item.actorId ?? null;
}

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const CAR_OBJECT_NAME = "Archetypes.Car.Car_Default";
const BOOST_OBJECT_NAME = "Archetypes.CarComponents.CarComponent_Boost";

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

function ensureSet(map, key) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }

  return map.get(key);
}

async function main() {
  const buffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(buffer);

  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];
  const headerPlayers = replay.properties?.PlayerStats ?? [];

  const headerPlayersByName = new Map(
    headerPlayers.map((player) => [player.Name, player]),
  );

  const activeActors = new Map();
  const priInfo = new Map();
  const carToPri = new Map();
  const boostToCar = new Map();
  const carIdsByPri = new Map();
  const boostIdsByPri = new Map();
  const teamActorToIndex = new Map();

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
        teamFromNetwork: null,
        teamActorId: null,
        uniqueId: null,
      });
    }

    ensureSet(carIdsByPri, priActorId);
    ensureSet(boostIdsByPri, priActorId);

    return priInfo.get(priActorId);
  }

  function rememberCarLink(carActorId, priActorId) {
    carToPri.set(carActorId, priActorId);
    ensurePri(priActorId);
    ensureSet(carIdsByPri, priActorId).add(carActorId);

    for (const [boostActorId, mappedCarId] of boostToCar.entries()) {
      if (mappedCarId === carActorId) {
        ensureSet(boostIdsByPri, priActorId).add(boostActorId);
      }
    }
  }

  function rememberBoostLink(boostActorId, carActorId) {
    boostToCar.set(boostActorId, carActorId);

    const priActorId = carToPri.get(carActorId);

    if (priActorId !== undefined) {
      ensurePri(priActorId);
      ensureSet(boostIdsByPri, priActorId).add(boostActorId);
    }
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

    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      const activeActor = activeActors.get(actorId);
      const activeObjectName = activeActor?.objectName ?? "unknown";
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (actorId === null) continue;
      if (!activeActor) continue;

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
          const playerName =
            strings.find((value) => headerPlayersByName.has(value)) ??
            strings.find((value) => value.length > 1 && value.length <= 40);

          if (playerName) {
            info.name = playerName;
          }
        }

        if (updateObjectName === "Engine.PlayerReplicationInfo:Team") {
          const nums = findNumbers(attribute);
          const teamActorRef = getActiveTeamActorId(nums, activeActors);

          if (teamActorRef !== undefined) {
            info.teamActorId = teamActorRef;
            info.teamFromNetwork = teamActorToIndex.get(teamActorRef) ?? null;
          }

          const directTeam = nums.find((num) => num === 0 || num === 1);

          if (info.teamFromNetwork === null && directTeam !== undefined) {
            info.teamFromNetwork = directTeam;
          }
        }

        if (updateObjectName === "Engine.PlayerReplicationInfo:UniqueId") {
          const strings = findStrings(attribute);
          if (strings.length > 0) {
            info.uniqueId = strings[strings.length - 1];
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
          rememberCarLink(actorId, priRef);
        }
      }

      if (
        activeObjectName === BOOST_OBJECT_NAME &&
        updateObjectName === "TAGame.CarComponent_TA:Vehicle"
      ) {
        const nums = findNumbers(attribute);
        const carRef = getActiveActorId(nums, activeActors, CAR_OBJECT_NAME);

        if (carRef !== undefined) {
          rememberBoostLink(actorId, carRef);
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

  const rows = [];

  for (const priId of [...priInfo.keys()].sort((a, b) => a - b)) {
    const info = priInfo.get(priId);
    const header = info.name ? headerPlayersByName.get(info.name) : null;
    const carActorIds = [...(carIdsByPri.get(priId) ?? [])].sort(
      (a, b) => a - b,
    );
    const boostActorIds = [...(boostIdsByPri.get(priId) ?? [])].sort(
      (a, b) => a - b,
    );

    const teamFromNetwork =
      info.teamFromNetwork ??
      (info.teamActorId !== null
        ? (teamActorToIndex.get(info.teamActorId) ?? null)
        : null);

    // rrrocket puts Platform at top-level of each PlayerStats entry
    // as {kind: "OnlinePlatform", value: "OnlinePlatform_Epic"}
    const platformRaw = header?.Platform ?? header?.PlayerID?.Platform;
    const platform = (() => {
      if (!platformRaw) return null;
      const raw = typeof platformRaw === "object"
        ? (platformRaw.value ?? platformRaw.kind ?? Object.values(platformRaw)[0])
        : String(platformRaw);
      return typeof raw === "string" ? raw.replace(/^OnlinePlatform_/, "") : null;
    })();

    rows.push({
      playerName: info.name ?? "UNKNOWN",
      team: header?.Team ?? teamFromNetwork,
      platform,
      score: header?.Score ?? null,
      goals: header?.Goals ?? null,
      assists: header?.Assists ?? null,
      saves: header?.Saves ?? null,
      shots: header?.Shots ?? null,
      priActorId: priId,
      carActorId: carActorIds[0] ?? null,
      boostActorId: boostActorIds[0] ?? null,
      carActorIds,
      boostActorIds,
      mappingSource: "network-links",
    });
  }

  const result = {
    replayName: replay.properties?.ReplayName ?? null,
    replayId: replay.properties?.Id ?? null,
    mapName: replay.properties?.MapName ?? null,
    totalSecondsPlayed: replay.properties?.TotalSecondsPlayed ?? null,
    actorCounts,
    players: rows,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf8");

  console.log("\nActor counts:");
  console.table(result.actorCounts);

  console.log("\nPlayer mapping:");
  console.table(
    rows.map((row) => ({
      Player: row.playerName,
      Team: row.team,
      Score: row.score,
      Goals: row.goals,
      Shots: row.shots,
      PRI: row.priActorId,
      Car: row.carActorId,
      Boost: row.boostActorId,
      Source: row.mappingSource,
    })),
  );

  console.log(`\nSaved mapping to: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Failed to build player mapping:");
  console.error(error);
  process.exit(1);
});
