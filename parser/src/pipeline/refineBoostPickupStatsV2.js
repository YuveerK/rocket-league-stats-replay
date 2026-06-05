import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const PICKUP_STATS_PATH = path.join(
  ROOT_DIR,
  "output",
  "boost-pickup-stats.json",
);
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "boost-pickup-stats-v2.json");

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

function getActorId(item) {
  return item.actor_id ?? item.actorId ?? null;
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

function getNearestPreviousLocation(samples, time) {
  if (!samples || samples.length === 0) return null;

  let best = null;

  for (const sample of samples) {
    if (sample.time <= time) {
      best = sample;
    } else {
      break;
    }
  }

  return best?.location ?? null;
}

function classifyPadFromActorHistory(eventsForActor) {
  const gains = eventsForActor
    .map((event) => event.estimatedBoostGain)
    .filter((gain) => typeof gain === "number" && gain > 0);

  if (gains.length === 0) return "unknown";

  const maxGain = Math.max(...gains);

  // If this pickup actor ever gave a large visible boost gain,
  // treat that pad actor as a big pad for all its events.
  if (maxGain >= 30) return "big";

  return "small";
}

function isStolenBoost(team, carLocation) {
  if (!carLocation || typeof carLocation.y !== "number") return false;

  const neutralZoneY = 1000;

  if (Math.abs(carLocation.y) < neutralZoneY) return false;

  // Approximation:
  // Team 0 owns negative Y side.
  // Team 1 owns positive Y side.
  if (team === 0) return carLocation.y > neutralZoneY;
  if (team === 1) return carLocation.y < -neutralZoneY;

  return false;
}

async function main() {
  const networkBuffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(networkBuffer);

  const pickupStats = JSON.parse(await fs.readFile(PICKUP_STATS_PATH, "utf8"));

  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];

  const activeActors = new Map();
  const carLocationSamples = new Map();

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

      if (objectName === "Archetypes.Car.Car_Default") {
        if (!carLocationSamples.has(actorId)) {
          carLocationSamples.set(actorId, []);
        }
      }
    }

    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;

      const activeActor = activeActors.get(actorId);
      if (!activeActor) continue;

      const updateObjectName = getObjectName(update, objects, names);

      if (
        activeActor.objectName === "Archetypes.Car.Car_Default" &&
        updateObjectName === "TAGame.RBActor_TA:ReplicatedRBState"
      ) {
        const location = getRigidBodyLocation(update.attribute);

        if (location) {
          if (!carLocationSamples.has(actorId)) {
            carLocationSamples.set(actorId, []);
          }

          carLocationSamples.get(actorId).push({
            frameIndex,
            time,
            location,
          });
        }
      }
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId =
        typeof deleted === "number" ? deleted : getActorId(deleted);

      if (deletedId !== null && deletedId !== undefined) {
        activeActors.delete(deletedId);
      }
    }
  }

  for (const samples of carLocationSamples.values()) {
    samples.sort((a, b) => a.time - b.time);
  }

  const events = pickupStats.events ?? [];

  const eventsByPickupActor = new Map();

  for (const event of events) {
    if (!eventsByPickupActor.has(event.pickupActorId)) {
      eventsByPickupActor.set(event.pickupActorId, []);
    }

    eventsByPickupActor.get(event.pickupActorId).push(event);
  }

  const padTypeByPickupActor = new Map();

  for (const [pickupActorId, actorEvents] of eventsByPickupActor.entries()) {
    padTypeByPickupActor.set(
      pickupActorId,
      classifyPadFromActorHistory(actorEvents),
    );
  }

  const refinedEvents = events.map((event) => {
    const carSamples = carLocationSamples.get(event.instigatorCarActorId) ?? [];

    const carLocationAtPickup = getNearestPreviousLocation(
      carSamples,
      event.time,
    );

    const refinedPadType =
      padTypeByPickupActor.get(event.pickupActorId) ??
      event.padType ??
      "unknown";

    return {
      ...event,
      location: event.location ?? carLocationAtPickup,
      carLocationAtPickup,
      padType: refinedPadType,
      isStolen: isStolenBoost(event.team, carLocationAtPickup),
    };
  });

  const byPlayer = new Map();

  for (const player of pickupStats.players ?? []) {
    byPlayer.set(player.playerName, {
      playerName: player.playerName,
      team: player.team,
      score: player.score,
      goals: player.goals,
      assists: player.assists,
      saves: player.saves,
      shots: player.shots,
      pickups: 0,
      bigPads: 0,
      smallPads: 0,
      unknownPads: 0,
      boostStolen: 0,
      boostCollectedActualGain: 0,
    });
  }

  for (const event of refinedEvents) {
    if (!byPlayer.has(event.playerName)) {
      byPlayer.set(event.playerName, {
        playerName: event.playerName,
        team: event.team,
        score: 0,
        goals: 0,
        assists: 0,
        saves: 0,
        shots: 0,
        pickups: 0,
        bigPads: 0,
        smallPads: 0,
        unknownPads: 0,
        boostStolen: 0,
        boostCollectedActualGain: 0,
      });
    }

    const row = byPlayer.get(event.playerName);

    row.pickups++;

    if (event.padType === "big") row.bigPads++;
    else if (event.padType === "small") row.smallPads++;
    else row.unknownPads++;

    if (event.isStolen) row.boostStolen++;

    if (typeof event.estimatedBoostGain === "number") {
      row.boostCollectedActualGain += event.estimatedBoostGain;
    }
  }

  const players = [...byPlayer.values()].map((player) => ({
    ...player,
    boostCollectedActualGain: Number(
      player.boostCollectedActualGain.toFixed(2),
    ),
    boostCollectedTheoreticalEstimate: Number(
      player.bigPads * 100 + player.smallPads * 12,
    ),
  }));

  const output = {
    replayName: pickupStats.replayName,
    replayId: pickupStats.replayId,
    mapName: pickupStats.mapName,
    notes: [
      "V2 refines stolen boost by using the instigator car location at pickup time.",
      "V2 refines big/small pad type by looking at each pickup actor's maximum visible boost gain.",
      "Big/small pad type is still an estimate until pad actor IDs are mapped to official map pad locations.",
    ],
    eventCount: refinedEvents.length,
    players,
    events: refinedEvents,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log("\nRefined boost pickup stats V2:");
  console.table(
    players.map((player) => ({
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

  const eventsWithCarLocation = refinedEvents.filter(
    (event) => event.carLocationAtPickup,
  ).length;

  console.log("\nLocation coverage:");
  console.table({
    totalEvents: refinedEvents.length,
    eventsWithCarLocation,
    eventsWithoutCarLocation: refinedEvents.length - eventsWithCarLocation,
  });

  console.log(`\nSaved refined stats to: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Failed to refine boost pickup stats:");
  console.error(error);
  process.exit(1);
});
