import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = process.cwd();
const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "match-meta.json");

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const STAT_EVENT_NAME = "TAGame.PRI_TA:ReplicatedStatEvent";
const SERVER_REGION_NAME = "ProjectX.GRI_X:ReplicatedServerRegion";
const PLAYLIST_NAME = "ProjectX.GRI_X:ReplicatedGamePlaylist";

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

function parsePlatform(platform) {
  if (!platform) return null;
  const raw = platform.value ?? platform.kind ?? String(platform);
  const cleaned = raw.replace(/^OnlinePlatform_/, "");
  return cleaned && cleaned !== "Unknown" ? cleaned : null;
}

function round(value, decimals = 2) {
  if (typeof value !== "number") return null;
  return Number(value.toFixed(decimals));
}

export function extractMatchMeta(replay) {
  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];
  const headerPlayers = replay.properties?.PlayerStats ?? [];
  const headerPlayersByName = new Map(headerPlayers.map((p) => [p.Name, p]));

  const activeActors = new Map();
  const priInfo = new Map();

  let overtime = false;
  let serverRegion = null;
  let playlist = null;
  const statMilestones = [];

  function ensurePri(priActorId) {
    if (!priInfo.has(priActorId)) {
      priInfo.set(priActorId, { priActorId, name: null });
    }
    return priInfo.get(priActorId);
  }

  function resolvePlayerName(priActorId) {
    return priInfo.get(priActorId)?.name ?? `UNKNOWN_PRI_${priActorId}`;
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
    }

    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;
      const activeActor = activeActors.get(actorId);
      if (!activeActor) continue;
      const activeObjectName = activeActor.objectName;
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (!overtime && updateObjectName.includes("bOverTime")) {
        if (attribute?.Boolean === true) overtime = true;
      }

      if (serverRegion === null && updateObjectName === SERVER_REGION_NAME) {
        serverRegion = attribute?.String ?? null;
      }

      if (playlist === null && updateObjectName === PLAYLIST_NAME) {
        const val = findNumbers(attribute).find((n) => Number.isInteger(n));
        if (val !== undefined) playlist = val;
      }

      if (activeObjectName === PRI_OBJECT_NAME && updateObjectName === "Engine.PlayerReplicationInfo:PlayerName") {
        const info = ensurePri(actorId);
        const strings = findStrings(attribute);
        const name =
          strings.find((s) => headerPlayersByName.has(s)) ??
          strings.find((s) => s.length > 1 && s.length <= 40);
        if (name) info.name = name;
      }

      if (activeObjectName === PRI_OBJECT_NAME && updateObjectName === STAT_EVENT_NAME) {
        const statEvent = attribute?.StatEvent;
        if (statEvent) {
          const objectId = statEvent.object_id ?? -1;
          if (objectId !== -1) {
            const milestoneName = getLookupName(objects, objectId) ?? `object_${objectId}`;
            const playerName = resolvePlayerName(actorId);
            statMilestones.push({ frameIndex, replayTimeSeconds: round(time), playerName, milestone: milestoneName });
          }
        }
      }
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId = typeof deleted === "number" ? deleted : getActorId(deleted);
      if (deletedId !== null) activeActors.delete(deletedId);
    }
  }

  const totalSecondsPlayed = replay.properties?.TotalSecondsPlayed ?? null;
  const forfeit = replay.properties?.bForfeit ?? false;
  const matchStartEpoch = replay.properties?.MatchStartEpoch
    ? Number(replay.properties.MatchStartEpoch)
    : null;

  if (!overtime && typeof totalSecondsPlayed === "number" && totalSecondsPlayed > 305) {
    overtime = true;
  }

  const players = headerPlayers.map((p) => ({
    name: p.Name,
    team: p.Team ?? null,
    isBot: p.bBot ?? false,
    platform: parsePlatform(p.Platform),
    onlineId: p.OnlineID ? String(p.OnlineID) : null,
  }));

  const highlights = (replay.properties?.HighLights ?? []).map((h) => ({
    frame: h.frame ?? null,
    carName: h.CarName ?? null,
    ballName: h.BallName ?? null,
    goalActorName: h.GoalActorName ?? null,
  }));

  return {
    replayName: replay.properties?.ReplayName ?? null,
    overtime,
    forfeit,
    totalSecondsPlayed,
    matchStartEpoch,
    matchType: replay.properties?.MatchType ?? null,
    teamSize: replay.properties?.TeamSize ?? null,
    recorderName: replay.properties?.PlayerName ?? null,
    unfairTeamSize: replay.properties?.UnfairTeamSize ?? false,
    date: replay.properties?.Date ?? null,
    serverRegion,
    playlist,
    highlights,
    players,
    statMilestones,
    notes: [
      "Overtime detected from any bOverTime boolean update in network frames, or if TotalSecondsPlayed > 305s.",
      "Forfeit comes from replay.properties.bForfeit.",
      "serverRegion comes from ProjectX.GRI_X:ReplicatedServerRegion (e.g. 'SAF', 'USE', 'EU').",
      "playlist is the raw Int from ProjectX.GRI_X:ReplicatedGamePlaylist (13=casual, 10=ranked, etc.).",
      "players lists identity info (platform, onlineId, isBot) from replay header PlayerStats.",
      "Stat milestones come from TAGame.PRI_TA:ReplicatedStatEvent updates (hat tricks, epic saves, etc.).",
    ],
  };
}

async function main() {
  const buffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(buffer);
  const output = extractMatchMeta(replay);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log(`\nOvertime: ${output.overtime} | Forfeit: ${output.forfeit}`);
  console.log(`Match type: ${output.matchType ?? "unknown"} | Team size: ${output.teamSize ?? "?"}`);
  console.log(`Server region: ${output.serverRegion ?? "unknown"} | Playlist: ${output.playlist ?? "unknown"}`);
  console.log(`Recorder: ${output.recorderName ?? "unknown"}`);
  console.log(
    `Players: ${output.players.map((p) => `${p.name} [${p.platform ?? "?"}${p.isBot ? " BOT" : ""}]`).join(", ")}`,
  );
  console.log(
    `Stat milestones: ${output.statMilestones.length > 0 ? output.statMilestones.map((m) => `${m.playerName}: ${m.milestone}`).join(", ") : "none"}`,
  );
  console.log(`\nSaved match meta to: ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to extract match meta:");
    console.error(error);
    process.exit(1);
  });
}
