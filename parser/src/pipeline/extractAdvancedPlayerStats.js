import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "advanced-player-stats.json");

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const CAR_OBJECT_NAME = "Archetypes.Car.Car_Default";
const RIGID_BODY_STATE = "TAGame.RBActor_TA:ReplicatedRBState";
const CAMERA_PRI_LINK = "TAGame.CameraSettingsActor_TA:PRI";
const CAMERA_SETTINGS = "TAGame.CameraSettingsActor_TA:ProfileSettings";
const CLIENT_LOADOUT = "TAGame.PRI_TA:ClientLoadouts";
const HANDBRAKE = "TAGame.Vehicle_TA:bReplicatedHandbrake";

const THROTTLE_NAMES = new Set([
  "TAGame.Vehicle_TA:ReplicatedThrottle",
  "TAGame.Car_TA:ReplicatedThrottle",
]);

const COMPONENT_OBJECT_NAMES = new Set([
  "Archetypes.CarComponents.CarComponent_Jump",
  "Archetypes.CarComponents.CarComponent_Dodge",
  "Archetypes.CarComponents.CarComponent_DoubleJump",
]);

// Threshold for "supersonic" in UU/s (approximate — calibrate if needed).
// Rocket League field is ~8192 UU wide and max car speed ≈ 2300 UU/s.
const SUPERSONIC_THRESHOLD = 2200;
// Car z when on the ground is ~17 UU (half car height). Values above this = airborne.
const AERIAL_THRESHOLD = 25;

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

function isTeamActorObject(name) {
  return (
    name === "Engine.TeamInfo" ||
    name === "TAGame.Team_TA" ||
    name.endsWith(".Team_TA")
  );
}

function getActiveTeamActorId(numbers, activeActors) {
  return numbers.find((n) => isTeamActorObject(activeActors.get(n)?.objectName ?? ""));
}

function getActiveActorId(numbers, activeActors, objectName) {
  return numbers.find((n) => activeActors.get(n)?.objectName === objectName);
}

function velocityMagnitude(v) {
  if (!v || typeof v.x !== "number") return null;
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function round(value, decimals = 2) {
  if (typeof value !== "number") return null;
  return Number(value.toFixed(decimals));
}

function ensureArray(map, key) {
  if (!map.has(key)) map.set(key, []);
  return map.get(key);
}

async function main() {
  const buffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(buffer);

  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];
  const headerPlayers = replay.properties?.PlayerStats ?? [];
  const headerPlayersByName = new Map(headerPlayers.map((p) => [p.Name, p]));

  const activeActors = new Map();
  const priInfo = new Map();
  const carToPri = new Map();
  const cameraToPri = new Map();
  const teamActorToIndex = new Map();

  const speedSamples = new Map();         // priActorId -> [{time, speed, z}]
  const throttleSamples = new Map();      // priActorId -> [rawValue]
  const brakeSamples = new Map();         // priActorId -> [boolean]
  const cameraByPri = new Map();          // priActorId -> CamSettings object
  const loadoutByPri = new Map();         // priActorId -> TeamLoadout object

  // New tracking
  const componentToCar = new Map();       // componentActorId -> carActorId
  const pingSamples = new Map();          // priActorId -> [byte values]
  const titleByPri = new Map();           // priActorId -> Int (opaque title ID)
  const partyLeaderByPri = new Map();     // priActorId -> PartyLeader object
  const totalGameTimeByPri = new Map();   // priActorId -> max Int seen
  const netQualityByPri = new Map();      // priActorId -> max Byte seen
  const onlineLoadoutByPri = new Map();   // priActorId -> LoadoutsOnline object
  const dodgeRefreshByPri = new Map();    // priActorId -> max DodgesRefreshedCounter
  const airActivateByPri = new Map();     // priActorId -> max AirActivateCount
  const dodgeCountByPri = new Map();      // priActorId -> count of DodgeTorque updates
  const doubleJumpByPri = new Map();      // priActorId -> count of DoubleJumpImpulse updates
  const steerSamples = new Map();         // priActorId -> [byte values (0-255, 128=center)]

  const frameTimes = frames.map((f) => f.time).filter((t) => typeof t === "number");
  const matchStart = frameTimes.length ? Math.min(...frameTimes) : 0;
  const matchEnd = frameTimes.length ? Math.max(...frameTimes) : 0;

  function ensurePri(priActorId) {
    if (!priInfo.has(priActorId)) {
      priInfo.set(priActorId, { priActorId, name: null, team: null, teamActorId: null });
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
        (info?.teamActorId != null ? (teamActorToIndex.get(info.teamActorId) ?? null) : null),
    };
  }

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const time = frame.time ?? frameIndex;

    for (const actor of frame.new_actors ?? []) {
      const actorId = getActorId(actor);
      if (actorId === null) continue;
      const objectName = getObjectName(actor, objects, names);
      activeActors.set(actorId, { actorId, objectName });
      if (objectName === PRI_OBJECT_NAME) ensurePri(actorId);
      // Components are linked to cars via TAGame.CarComponent_TA:Vehicle later
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
        const idx = nums.find((n) => n === 0 || n === 1);
        if (idx !== undefined) teamActorToIndex.set(actorId, idx);
      }

      // Link car component → car (covers Jump/Dodge/DoubleJump components)
      if (updateObjectName === "TAGame.CarComponent_TA:Vehicle") {
        const nums = findNumbers(attribute);
        const carRef = getActiveActorId(nums, activeActors, CAR_OBJECT_NAME);
        if (carRef !== undefined) componentToCar.set(actorId, carRef);
      }

      // PRI: player name + team
      if (activeObjectName === PRI_OBJECT_NAME) {
        const info = ensurePri(actorId);

        if (updateObjectName === "Engine.PlayerReplicationInfo:PlayerName") {
          const strings = findStrings(attribute);
          const name =
            strings.find((s) => headerPlayersByName.has(s)) ??
            strings.find((s) => s.length > 1 && s.length <= 40);
          if (name) info.name = name;
        }

        if (updateObjectName === "Engine.PlayerReplicationInfo:Team") {
          const nums = findNumbers(attribute);
          const teamActorRef = getActiveTeamActorId(nums, activeActors);
          if (teamActorRef !== undefined) {
            info.teamActorId = teamActorRef;
            info.team = teamActorToIndex.get(teamActorRef) ?? null;
          }
          const direct = nums.find((n) => n === 0 || n === 1);
          if (info.team === null && direct !== undefined) info.team = direct;
        }

        if (updateObjectName === CLIENT_LOADOUT && attribute?.TeamLoadout) {
          const tl = attribute.TeamLoadout;
          const info = priInfo.get(actorId);
          const raw = (info?.team === 1 ? tl.orange : tl.blue) ?? tl.blue ?? tl.orange;
          if (raw) {
            loadoutByPri.set(actorId, {
              ...raw,
              bodyName: getLookupName(objects, raw.body) ?? null,
            });
          }
        }

        if (updateObjectName === "Engine.PlayerReplicationInfo:Ping") {
          const raw = findNumbers(attribute)[0];
          // UE3 compresses ping as floor(actualMs / 4); multiply back to get ms.
          if (typeof raw === "number") ensureArray(pingSamples, actorId).push(raw * 4);
        }

        if (updateObjectName === "TAGame.PRI_TA:Title") {
          const val = findNumbers(attribute).find((n) => Number.isInteger(n));
          if (val !== undefined) titleByPri.set(actorId, val);
        }

        if (updateObjectName === "TAGame.PRI_TA:PartyLeader") {
          const pl = attribute?.PartyLeader ?? null;
          if (pl) partyLeaderByPri.set(actorId, pl);
        }

        if (updateObjectName === "TAGame.PRI_TA:TotalGameTimePlayed") {
          const val = findNumbers(attribute).find((n) => Number.isInteger(n));
          if (val !== undefined) {
            totalGameTimeByPri.set(actorId, Math.max(totalGameTimeByPri.get(actorId) ?? 0, val));
          }
        }

        if (updateObjectName === "TAGame.PRI_TA:ReplicatedWorstNetQualityBeyondLatency") {
          const val = findNumbers(attribute)[0];
          if (typeof val === "number") {
            netQualityByPri.set(actorId, Math.max(netQualityByPri.get(actorId) ?? 0, val));
          }
        }

        if (updateObjectName === "TAGame.PRI_TA:ClientLoadoutsOnline") {
          const lo = attribute?.LoadoutsOnline;
          if (lo) onlineLoadoutByPri.set(actorId, lo);
        }
      }

      // CAR: link to PRI
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

      // CAR: physics → speed + altitude
      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === RIGID_BODY_STATE) {
        const priId = carToPri.get(actorId);
        if (priId !== undefined) {
          const rb = attribute?.RigidBody;
          if (rb) {
            const speed = velocityMagnitude(rb.linear_velocity);
            const z = rb.location?.z ?? 0;
            if (speed !== null) {
              ensureArray(speedSamples, priId).push({ time, speed, z });
            }
          }
        }
      }

      // CAR: throttle input
      if (activeObjectName === CAR_OBJECT_NAME && THROTTLE_NAMES.has(updateObjectName)) {
        const priId = carToPri.get(actorId);
        if (priId !== undefined) {
          const nums = findNumbers(attribute);
          if (nums.length > 0) ensureArray(throttleSamples, priId).push(nums[0]);
        }
      }

      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === HANDBRAKE) {
        const priId = carToPri.get(actorId);
        if (priId !== undefined) {
          const isHandbrake = attribute?.Boolean === true;
          ensureArray(brakeSamples, priId).push(isHandbrake);
        }
      }

      // CAR: dodge refreshes (wall/ceiling touches that reset dodge)
      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === "TAGame.Car_TA:DodgesRefreshedCounter") {
        const priId = carToPri.get(actorId);
        if (priId !== undefined) {
          const val = findNumbers(attribute).find((n) => Number.isInteger(n));
          if (val !== undefined) {
            dodgeRefreshByPri.set(priId, Math.max(dodgeRefreshByPri.get(priId) ?? 0, val));
          }
        }
      }

      // CAR: steering input
      if (activeObjectName === CAR_OBJECT_NAME && updateObjectName === "TAGame.Vehicle_TA:ReplicatedSteer") {
        const priId = carToPri.get(actorId);
        if (priId !== undefined) {
          const val = findNumbers(attribute)[0];
          if (typeof val === "number") ensureArray(steerSamples, priId).push(val);
        }
      }

      // COMPONENT: air rolls (Jump component carries AirActivateCount)
      if (updateObjectName === "TAGame.CarComponent_AirActivate_TA:AirActivateCount") {
        const carId = componentToCar.get(actorId);
        if (carId !== undefined) {
          const priId = carToPri.get(carId);
          if (priId !== undefined) {
            const val = findNumbers(attribute).find((n) => Number.isInteger(n));
            if (val !== undefined) {
              airActivateByPri.set(priId, Math.max(airActivateByPri.get(priId) ?? 0, val));
            }
          }
        }
      }

      // COMPONENT: dodge count (each DodgeTorque update = one dodge executed)
      if (updateObjectName === "TAGame.CarComponent_Dodge_TA:DodgeTorque") {
        const carId = componentToCar.get(actorId);
        if (carId !== undefined) {
          const priId = carToPri.get(carId);
          if (priId !== undefined) {
            dodgeCountByPri.set(priId, (dodgeCountByPri.get(priId) ?? 0) + 1);
          }
        }
      }

      // COMPONENT: double jumps
      if (updateObjectName === "TAGame.CarComponent_DoubleJump_TA:DoubleJumpImpulse") {
        const carId = componentToCar.get(actorId);
        if (carId !== undefined) {
          const priId = carToPri.get(carId);
          if (priId !== undefined) {
            doubleJumpByPri.set(priId, (doubleJumpByPri.get(priId) ?? 0) + 1);
          }
        }
      }

      // Camera → PRI link
      if (updateObjectName === CAMERA_PRI_LINK) {
        const priActorRef =
          attribute?.ActiveActor?.actor_id ??
          findNumbers(attribute).find((n) => priInfo.has(n));
        if (priActorRef !== undefined) cameraToPri.set(actorId, priActorRef);
      }

      // Camera settings
      if (updateObjectName === CAMERA_SETTINGS) {
        const priId = cameraToPri.get(actorId);
        if (priId !== undefined && attribute?.CamSettings) {
          cameraByPri.set(priId, attribute.CamSettings);
        }
      }
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId = typeof deleted === "number" ? deleted : getActorId(deleted);
      if (deletedId === null || deletedId === undefined) continue;

      const actor = activeActors.get(deletedId);
      if (actor?.objectName === CAR_OBJECT_NAME) {
        carToPri.delete(deletedId);
        for (const [compId, carId] of componentToCar.entries()) {
          if (carId === deletedId) componentToCar.delete(compId);
        }
      } else if (actor?.objectName === PRI_OBJECT_NAME) {
        for (const [carId, priId] of carToPri.entries()) {
          if (priId === deletedId) carToPri.delete(carId);
        }
      } else if (COMPONENT_OBJECT_NAMES.has(actor?.objectName)) {
        componentToCar.delete(deletedId);
      }
      activeActors.delete(deletedId);
    }
  }

  function extractPartyKey(partyLeader) {
    if (!partyLeader) return null;
    const remote = partyLeader.remote_id;
    if (!remote || typeof remote !== "object") return null;
    const platform = Object.keys(remote)[0];
    const id = remote[platform];
    if (id == null) return null;
    // remote_id values can be a plain string/number (Epic) or a nested object (PS4/Xbox).
    const idStr = typeof id === "object"
      ? (Object.values(id)[0] ?? JSON.stringify(id))
      : String(id);
    return idStr ? `${platform}:${idStr}` : null;
  }

  function parseOnlineLoadout(loadoutsOnline, team) {
    if (!loadoutsOnline) return null;
    const slots = (team === 1 ? loadoutsOnline.orange : loadoutsOnline.blue) ?? loadoutsOnline.blue ?? [];
    const SLOT_NAMES = ["body", "decal", "wheels", "boost", "antenna", "topper", "goalExplosion"];
    const painted = [];
    slots.forEach((items, slotIndex) => {
      if (!Array.isArray(items) || items.length === 0) return;
      const attrs = items.map((item) => ({
        attributeType: getLookupName(objects, item.object_ind) ?? `attr_${item.object_ind}`,
        value: item.value ?? null,
      }));
      painted.push({ slot: slotIndex, slotName: SLOT_NAMES[slotIndex] ?? null, attributes: attrs });
    });
    return painted.length ? painted : null;
  }

  const matchDuration = Math.max(1, matchEnd - matchStart);

  const players = [...priInfo.keys()]
    .sort((a, b) => a - b)
    .map((priActorId) => {
      const { playerName, team } = resolvePlayer(priActorId);
      const samples = speedSamples.get(priActorId) ?? [];
      const throttles = throttleSamples.get(priActorId) ?? [];
      const brakes = brakeSamples.get(priActorId) ?? [];

      const speeds = samples.map((s) => s.speed);
      const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
      const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

      let supersonicSeconds = 0;
      let airborneSeconds = 0;

      for (let i = 0; i < samples.length - 1; i++) {
        const dt = samples[i + 1].time - samples[i].time;
        if (dt <= 0 || dt > 1) continue; // skip gaps (goals, etc.)
        if (samples[i].speed >= SUPERSONIC_THRESHOLD) supersonicSeconds += dt;
        if (samples[i].z >= AERIAL_THRESHOLD) airborneSeconds += dt;
      }

      const rawThrottleMax = throttles.length ? Math.max(...throttles) : 1;
      const normFactor = rawThrottleMax > 1 ? rawThrottleMax : 1;
      const avgThrottle =
        throttles.length
          ? round(throttles.reduce((a, b) => a + b, 0) / throttles.length / normFactor, 3)
          : null;

      const handbrakeUsagePct =
        brakes.length
          ? round((brakes.filter(Boolean).length / brakes.length) * 100, 1)
          : null;

      const cam = cameraByPri.get(priActorId);
      const loadoutRaw = loadoutByPri.get(priActorId);

      const pings = pingSamples.get(priActorId) ?? [];
      const avgPing = pings.length ? round(pings.reduce((a, b) => a + b, 0) / pings.length, 1) : null;
      const maxPing = pings.length ? Math.max(...pings) : null;

      const steers = steerSamples.get(priActorId) ?? [];
      const avgSteerDeviation = steers.length
        ? round(steers.reduce((sum, s) => sum + Math.abs(s - 128), 0) / steers.length / 128 * 100, 1)
        : null;

      const partyLeader = partyLeaderByPri.get(priActorId) ?? null;
      const onlineLoadoutRaw = onlineLoadoutByPri.get(priActorId) ?? null;
      const { playerName: resolvedName, team: resolvedTeam } = resolvePlayer(priActorId);

      return {
        playerName,
        team,
        maxSpeedUU: round(maxSpeed, 1),
        avgSpeedUU: round(avgSpeed, 1),
        supersonicSeconds: round(supersonicSeconds),
        supersonicPct: round((supersonicSeconds / matchDuration) * 100, 1),
        airborneSeconds: round(airborneSeconds),
        airbornePct: round((airborneSeconds / matchDuration) * 100, 1),
        avgThrottle,
        handbrakeUsagePct,
        avgPing,
        maxPing,
        titleId: titleByPri.get(priActorId) ?? null,
        partyLeaderId: extractPartyKey(partyLeader),
        totalGameTimePlayed: totalGameTimeByPri.get(priActorId) ?? null,
        worstNetQuality: netQualityByPri.get(priActorId) ?? null,
        airRolls: airActivateByPri.get(priActorId) ?? null,
        dodgesRefreshed: dodgeRefreshByPri.get(priActorId) ?? null,
        dodgeCount: dodgeCountByPri.get(priActorId) ?? null,
        doubleJumps: doubleJumpByPri.get(priActorId) ?? null,
        avgSteerDeviation,
        camera: cam
          ? {
              fov: cam.fov ?? null,
              height: cam.height ?? null,
              angle: cam.angle ?? null,
              distance: cam.distance ?? null,
              stiffness: cam.stiffness ?? null,
              swivel: cam.swivel ?? null,
            }
          : null,
        loadout: loadoutRaw
          ? {
              body: loadoutRaw.body ?? null,
              decal: loadoutRaw.decal ?? null,
              wheels: loadoutRaw.wheels ?? null,
              rocketTrail: loadoutRaw.rocket_trail ?? null,
              antenna: loadoutRaw.antenna ?? null,
              topper: loadoutRaw.topper ?? null,
              goalExplosion: loadoutRaw.goal_explosion ?? null,
            }
          : null,
        onlineLoadout: parseOnlineLoadout(onlineLoadoutRaw, resolvedTeam),
      };
    });

  const output = {
    replayName: replay.properties?.ReplayName ?? null,
    notes: [
      `Supersonic threshold: ${SUPERSONIC_THRESHOLD} UU/s (approximate — calibrate against known clips if needed).`,
      `Aerial threshold: car Z > ${AERIAL_THRESHOLD} UU.`,
      "Throttle is normalized to 0–1 based on max observed raw value.",
      "Camera/loadout are the last-seen values from network updates.",
      "avgPing/maxPing come from Engine.PlayerReplicationInfo:Ping. Raw byte × 4 = ms (standard UE3 compression).",
      "titleId is an opaque Int from TAGame.PRI_TA:Title — requires external Rocket League asset data to resolve.",
      "partyLeaderId is a stable 'Platform:ID' string identifying the party leader; players sharing one are in a party.",
      "totalGameTimePlayed is the max Int seen from TAGame.PRI_TA:TotalGameTimePlayed (units: seconds of career playtime).",
      "worstNetQuality is the max Byte from TAGame.PRI_TA:ReplicatedWorstNetQualityBeyondLatency (0=best).",
      "airRolls is the max AirActivateCount from the Jump component (jump + flip + air roll activations).",
      "dodgesRefreshed is the max DodgesRefreshedCounter on the car (wall/ceiling touches that restored dodge).",
      "dodgeCount is the number of DodgeTorque updates (each = one dodge executed).",
      "doubleJumps is the count of DoubleJumpImpulse updates.",
      "avgSteerDeviation is the average absolute steering deviation from center, normalized to 0-100.",
      "onlineLoadout lists slots with painted/certified attributes from ClientLoadoutsOnline.",
    ],
    players,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log("\nAdvanced player stats:");
  console.table(
    players.map((p) => ({
      Player: p.playerName,
      Team: p.team,
      "Max Speed": p.maxSpeedUU,
      "Supersonic %": `${p.supersonicPct}%`,
      "Airborne %": `${p.airbornePct}%`,
      "Avg Ping": p.avgPing !== null ? `${p.avgPing}ms` : "n/a",
      "Air Rolls": p.airRolls ?? "n/a",
      Dodges: p.dodgeCount ?? "n/a",
      "Dodge Refresh": p.dodgesRefreshed ?? "n/a",
      "Dbl Jumps": p.doubleJumps ?? "n/a",
      Party: p.partyLeaderId ?? "solo",
    })),
  );

  console.log(`\nSaved advanced player stats to: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Failed to extract advanced player stats:");
  console.error(error);
  process.exit(1);
});
