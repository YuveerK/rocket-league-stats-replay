import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "ball-stats.json");
const TIMELINE_OUTPUT_PATH = path.join(ROOT_DIR, "output", "ball-position-timeline.json");

const BALL_HIT_TEAM_NUM = "TAGame.Ball_TA:HitTeamNum";
const RIGID_BODY_STATE = "TAGame.RBActor_TA:ReplicatedRBState";

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

function findNumbers(value, result = []) {
  if (value === null || value === undefined) return result;
  if (typeof value === "number") { result.push(value); return result; }
  if (Array.isArray(value)) { for (const item of value) findNumbers(item, result); return result; }
  if (typeof value === "object") { for (const child of Object.values(value)) findNumbers(child, result); }
  return result;
}

function isBallObjectName(name) {
  return name.startsWith("Archetypes.Ball.") || name.startsWith("TAGame.Ball_");
}

function velocityMagnitude(v) {
  if (!v || typeof v.x !== "number") return null;
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
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

async function main() {
  const buffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(buffer);

  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];

  const activeActors = new Map();
  const ballActorIds = new Set();

  let currentHitTeam = null;
  let lastHitTeamChangeTime = null;
  const possessionSeconds = [0, 0];

  const speedSamples = [];
  const heightSamples = [];
  const ballSamples = [];

  let firstFrameTime = null;
  let lastFrameTime = null;

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const time = frame.time ?? frameIndex;

    if (firstFrameTime === null) firstFrameTime = time;
    lastFrameTime = time;

    for (const actor of frame.new_actors ?? []) {
      const actorId = getActorId(actor);
      if (actorId === null) continue;
      const objectName = getObjectName(actor, objects, names);
      activeActors.set(actorId, { actorId, objectName });
      if (isBallObjectName(objectName)) ballActorIds.add(actorId);
    }

    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;

      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (updateObjectName === BALL_HIT_TEAM_NUM) {
        ballActorIds.add(actorId);
        const nums = findNumbers(attribute);
        const hitTeam = nums.find((n) => n === 0 || n === 1);

        if (hitTeam !== undefined && hitTeam !== currentHitTeam) {
          if (currentHitTeam !== null && lastHitTeamChangeTime !== null) {
            possessionSeconds[currentHitTeam] += time - lastHitTeamChangeTime;
          }
          currentHitTeam = hitTeam;
          // On first touch count possession from match start; subsequent touches from current time.
          lastHitTeamChangeTime = lastHitTeamChangeTime === null ? (firstFrameTime ?? time) : time;
        }
      }

      if (updateObjectName === RIGID_BODY_STATE && ballActorIds.has(actorId)) {
        const rb = attribute?.RigidBody;
        if (rb) {
          const speed = velocityMagnitude(rb.linear_velocity);
          if (speed !== null) speedSamples.push(speed);
          if (typeof rb.location?.z === "number") heightSamples.push(rb.location.z);
          if (
            typeof rb.location?.x === "number" &&
            typeof rb.location?.y === "number" &&
            typeof rb.location?.z === "number"
          ) {
            const sample = {
              frameIndex,
              time: round(time, 3),
              elapsedSeconds: round(time - firstFrameTime, 3),
              x: round(rb.location.x, 2),
              y: round(rb.location.y, 2),
              z: round(rb.location.z, 2),
              speedUU: speed !== null ? round(speed, 1) : null,
              lastTouchTeam: currentHitTeam,
            };

            if (hasQuaternion(rb.rotation)) {
              sample.qx = round(rb.rotation.x, 6);
              sample.qy = round(rb.rotation.y, 6);
              sample.qz = round(rb.rotation.z, 6);
              sample.qw = round(rb.rotation.w, 6);
            }

            if (hasVector3(rb.linear_velocity)) {
              sample.vx = round(rb.linear_velocity.x);
              sample.vy = round(rb.linear_velocity.y);
              sample.vz = round(rb.linear_velocity.z);
            }

            ballSamples.push(sample);
          }
        }
      }
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId = typeof deleted === "number" ? deleted : getActorId(deleted);
      if (deletedId !== null) activeActors.delete(deletedId);
    }
  }

  if (currentHitTeam !== null && lastHitTeamChangeTime !== null && lastFrameTime !== null) {
    possessionSeconds[currentHitTeam] += lastFrameTime - lastHitTeamChangeTime;
  }

  const totalPossession = possessionSeconds[0] + possessionSeconds[1];
  const maxSpeed = speedSamples.length ? Math.max(...speedSamples) : 0;
  const avgSpeed = speedSamples.length
    ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
    : 0;

  const AERIAL_THRESHOLD_UU = 100;
  const aerialCount = heightSamples.filter((z) => z > AERIAL_THRESHOLD_UU).length;

  const output = {
    replayName: replay.properties?.ReplayName ?? null,
    notes: [
      "Possession derived from TAGame.Ball_TA:HitTeamNum transitions over time.",
      "Ball speed is the magnitude of linear_velocity from ReplicatedRBState in UU/s.",
      "Aerial is counted when ball Z > 100 UU.",
    ],
    possession: {
      team0Seconds: round(possessionSeconds[0]),
      team1Seconds: round(possessionSeconds[1]),
      team0Pct:
        totalPossession > 0
          ? round((possessionSeconds[0] / totalPossession) * 100, 1)
          : 50,
      team1Pct:
        totalPossession > 0
          ? round((possessionSeconds[1] / totalPossession) * 100, 1)
          : 50,
    },
    ballSpeed: {
      maxSpeedUU: round(maxSpeed, 1),
      avgSpeedUU: round(avgSpeed, 1),
      sampleCount: speedSamples.length,
    },
    ballAerial: {
      aerialSamples: aerialCount,
      totalSamples: heightSamples.length,
      aerialPct:
        heightSamples.length
          ? round((aerialCount / heightSamples.length) * 100, 1)
          : 0,
    },
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");
  await fs.writeFile(
    TIMELINE_OUTPUT_PATH,
    JSON.stringify({
      replayName: output.replayName,
      sampleCount: ballSamples.length,
      fieldBounds: {
        minX: -4096,
        maxX: 4096,
        minY: -5120,
        maxY: 5120,
      },
      notes: [
        "Ball positions are extracted from ball ReplicatedRBState updates.",
        "elapsedSeconds is relative to the first network frame.",
        "lastTouchTeam is derived from the latest TAGame.Ball_TA:HitTeamNum update when available.",
      ],
      samples: ballSamples,
    }, null, 2),
    "utf8",
  );

  console.log("\nBall possession:");
  console.table({
    "Team 0": {
      Seconds: output.possession.team0Seconds,
      "%": `${output.possession.team0Pct}%`,
    },
    "Team 1": {
      Seconds: output.possession.team1Seconds,
      "%": `${output.possession.team1Pct}%`,
    },
  });
  console.log(
    `Ball speed: max=${output.ballSpeed.maxSpeedUU} avg=${output.ballSpeed.avgSpeedUU} UU/s`,
  );
  console.log(`Ball aerial: ${output.ballAerial.aerialPct}% of samples`);
  console.log(`\nSaved ball stats to: ${OUTPUT_PATH}`);
  console.log(`Saved ball timeline to: ${TIMELINE_OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("Failed to extract ball stats:");
  console.error(error);
  process.exit(1);
});
