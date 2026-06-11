import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = process.cwd();
const NETWORK_JSON_PATH = path.join(ROOT_DIR, "output", "replay-network.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "output", "game-timeline.json");

const PRI_OBJECT_NAME = "TAGame.Default__PRI_TA";
const CAR_OBJECT_NAME = "Archetypes.Car.Car_Default";
const STATE_NAME_UPDATE = "TAGame.GameEvent_TA:ReplicatedStateName";
const COUNTDOWN_STATE = "Countdown";

const COUNTER_EVENTS = new Map([
  ["TAGame.PRI_TA:MatchShots", { statKey: "shots", type: "shot" }],
  ["TAGame.PRI_TA:MatchSaves", { statKey: "saves", type: "save" }],
  ["TAGame.PRI_TA:MatchAssists", { statKey: "assists", type: "assist" }],
  ["TAGame.PRI_TA:CarDemolitions", { statKey: "kills", type: "kill" }],
  ["TAGame.PRI_TA:BallDemolitions", { statKey: "kills", type: "kill" }],
  ["TAGame.PRI_TA:MatchDemolishes", { statKey: "kills", type: "kill" }],
  ["TAGame.PRI_TA:SelfDemolitions", { statKey: "deaths", type: "death" }],
  ["Engine.PlayerReplicationInfo:Deaths", { statKey: "deaths", type: "death" }],
]);

const DEMO_UPDATE_NAMES = new Set([
  "TAGame.Car_TA:ReplicatedDemolish",
  "TAGame.Car_TA:ReplicatedDemolishExtended",
  "TAGame.Car_TA:ReplicatedDemolishGoalExplosion",
]);

const DEMO_SIGNAL_NAMES = new Set([
  "TAGame.PRI_TA:CarDemolitions",
  "TAGame.PRI_TA:BallDemolitions",
  "TAGame.PRI_TA:MatchDemolishes",
  "TAGame.PRI_TA:SelfDemolitions",
  "Engine.PlayerReplicationInfo:Deaths",
  ...DEMO_UPDATE_NAMES,
]);

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

function extractCounterValue(attribute) {
  if (typeof attribute?.Int === "number") return attribute.Int;
  const numbers = findNumbers(attribute);
  const integer = numbers.find((value) => Number.isInteger(value));
  return integer ?? null;
}

function roundSeconds(value) {
  if (typeof value !== "number") return null;
  return Number(value.toFixed(3));
}

function formatClock(seconds) {
  if (typeof seconds !== "number") return null;
  const sign = seconds < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(seconds));
  const minutes = Math.floor(absolute / 60);
  const remainingSeconds = absolute % 60;
  return `${sign}${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function ceilToNearest(value, step) {
  if (typeof value !== "number" || value <= 0) return null;
  return Math.ceil(value / step) * step;
}

function deriveInitialClockSeconds(clockSamples, fallback = null) {
  const firstSample = clockSamples.find(
    (sample) => typeof sample.gameSecondsRemaining === "number",
  );
  if (firstSample) return firstSample.gameSecondsRemaining;
  return fallback;
}

function findOvertimeStartSample(clockSamples) {
  let lowestSeenClock = Number.POSITIVE_INFINITY;
  let previousSample = null;
  for (const sample of clockSamples) {
    const gameSecondsRemaining = sample.gameSecondsRemaining;
    if (typeof gameSecondsRemaining !== "number") continue;
    if (previousSample) {
      const clockStartedCountingUp =
        lowestSeenClock <= 1 && gameSecondsRemaining > previousSample.gameSecondsRemaining;
      const jumpedFromRegulationEnd =
        lowestSeenClock <= 5 &&
        gameSecondsRemaining - previousSample.gameSecondsRemaining > 5;
      if (clockStartedCountingUp || jumpedFromRegulationEnd) return sample;
    }
    lowestSeenClock = Math.min(lowestSeenClock, gameSecondsRemaining);
    previousSample = sample;
  }
  return null;
}

function applyOvertimeClockElapsed(events, overtimeStartSample, initialClockSeconds) {
  if (!overtimeStartSample || typeof initialClockSeconds !== "number") return;
  for (const event of events) {
    if (typeof event.frameIndex !== "number") continue;
    if (event.frameIndex < overtimeStartSample.frameIndex) continue;
    if (typeof event.gameSecondsRemaining !== "number") continue;
    const gameClockElapsedSeconds = initialClockSeconds + event.gameSecondsRemaining;
    event.gameClockElapsedSeconds = roundSeconds(gameClockElapsedSeconds);
    event.gameClockElapsed = formatClock(gameClockElapsedSeconds);
  }
}

function clampElapsedSeconds(elapsedSeconds, durationSeconds) {
  if (typeof elapsedSeconds !== "number") return null;
  if (typeof durationSeconds !== "number") return roundSeconds(elapsedSeconds);
  return roundSeconds(Math.min(Math.max(elapsedSeconds, 0), durationSeconds));
}

function findClockAtFrame(clockSamples, frameIndex) {
  let current = null;
  for (const sample of clockSamples) {
    if (sample.frameIndex > frameIndex) break;
    current = sample;
  }
  return current;
}

function getNameValue(names, objects, id) {
  return getLookupName(names, id) ?? getLookupName(objects, id) ?? null;
}

function buildCountdownIntervals(stateSamples, finalElapsedSeconds) {
  const intervals = [];
  for (let index = 0; index < stateSamples.length; index++) {
    const sample = stateSamples[index];
    if (sample.stateName !== COUNTDOWN_STATE) continue;
    const nextSample = stateSamples[index + 1];
    const start = sample.elapsedSeconds;
    const end = nextSample?.elapsedSeconds ?? finalElapsedSeconds;
    if (typeof start === "number" && typeof end === "number" && end > start) {
      intervals.push({ start, end });
    }
  }
  // Keep the initial kickoff countdown visible at the start of the rail.
  return intervals.slice(1);
}

function timelineElapsedSeconds(elapsedSeconds, ignoredIntervals) {
  if (typeof elapsedSeconds !== "number") return null;
  let ignoredSeconds = 0;
  for (const interval of ignoredIntervals) {
    if (elapsedSeconds <= interval.start) break;
    ignoredSeconds += Math.min(elapsedSeconds, interval.end) - interval.start;
  }
  return roundSeconds(elapsedSeconds - ignoredSeconds);
}

function buildClockPlaybackSamples({ clockSamples, firstFrameTime, initialClockSeconds, clockZeroElapsedSeconds, totalSecondsPlayed }) {
  if (!Array.isArray(clockSamples) || typeof initialClockSeconds !== "number") return [];
  const samples = [];
  let lastPlayback = Number.NEGATIVE_INFINITY;
  let lastRaw = Number.NEGATIVE_INFINITY;
  for (const sample of clockSamples) {
    if (typeof sample.replayTime !== "number" || typeof sample.gameSecondsRemaining !== "number") continue;
    const rawElapsedSeconds = sample.replayTime - firstFrameTime;
    if (!Number.isFinite(rawElapsedSeconds) || rawElapsedSeconds < 0) continue;
    const overtimeElapsed =
      sample.gameSecondsRemaining === 0 &&
      clockZeroElapsedSeconds !== null &&
      rawElapsedSeconds > clockZeroElapsedSeconds
        ? initialClockSeconds + (rawElapsedSeconds - clockZeroElapsedSeconds)
        : null;
    const clockElapsed = overtimeElapsed ?? initialClockSeconds - sample.gameSecondsRemaining;
    if (!Number.isFinite(clockElapsed) || clockElapsed < 0) continue;
    const playbackSeconds =
      typeof totalSecondsPlayed === "number"
        ? Math.min(clockElapsed, totalSecondsPlayed)
        : clockElapsed;
    const roundedPlayback = roundSeconds(playbackSeconds);
    const roundedRaw = roundSeconds(rawElapsedSeconds);
    if (roundedPlayback <= lastPlayback || roundedRaw < lastRaw) continue;
    samples.push({
      rawElapsedSeconds: roundedRaw,
      playbackSeconds: roundedPlayback,
      gameSecondsRemaining: sample.gameSecondsRemaining,
    });
    lastPlayback = roundedPlayback;
    lastRaw = roundedRaw;
  }
  return samples;
}

function createEventBase({ type, frameIndex, replayTime, firstFrameTime, clockSample, initialClockSeconds, clockZeroElapsedSeconds, source }) {
  const elapsedSeconds =
    typeof replayTime === "number" && typeof firstFrameTime === "number"
      ? replayTime - firstFrameTime
      : null;
  const gameSecondsRemaining = clockSample?.gameSecondsRemaining ?? null;
  const clockDerivedElapsed =
    typeof initialClockSeconds === "number" && typeof gameSecondsRemaining === "number"
      ? initialClockSeconds - gameSecondsRemaining
      : null;
  const overtimeOffset =
    gameSecondsRemaining === 0 &&
    typeof elapsedSeconds === "number" &&
    clockZeroElapsedSeconds !== null
      ? elapsedSeconds - clockZeroElapsedSeconds
      : null;
  const gameClockElapsedSeconds =
    overtimeOffset !== null && overtimeOffset > 0.5
      ? initialClockSeconds + overtimeOffset
      : clockDerivedElapsed;
  return {
    id: null, type, frameIndex,
    replayTimeSeconds: roundSeconds(replayTime),
    elapsedSeconds: roundSeconds(elapsedSeconds),
    elapsedClock: formatClock(elapsedSeconds),
    gameSecondsRemaining,
    gameClockRemaining: formatClock(gameSecondsRemaining),
    gameClockElapsedSeconds: roundSeconds(gameClockElapsedSeconds),
    gameClockElapsed: formatClock(gameClockElapsedSeconds),
    source,
  };
}

function incrementPlayerSummary(playerSummary, playerName, team, type) {
  if (!playerSummary.has(playerName)) {
    playerSummary.set(playerName, { playerName, team, goals: 0, shots: 0, saves: 0, assists: 0, kills: 0, deaths: 0 });
  }
  const summary = playerSummary.get(playerName);
  if (summary.team === null || summary.team === undefined) summary.team = team;
  if (type === "goal") summary.goals++;
  if (type === "shot") summary.shots++;
  if (type === "save") summary.saves++;
  if (type === "assist") summary.assists++;
  if (type === "kill") summary.kills++;
  if (type === "death") summary.deaths++;
}

function incrementMapCount(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function getEventTimeSeconds(event) {
  return event.replayTimeSeconds ?? Number.POSITIVE_INFINITY;
}

function getDemoPairKey(event) {
  if (event.type === "kill") return `${event.playerName}|${event.victimPlayerName ?? "unknown"}`;
  if (event.type === "death") return `${event.killerPlayerName ?? "unknown"}|${event.playerName}`;
  return null;
}

function isDuplicateRawDemoEvent(event, keptRawDemoEvents, windowSeconds = 3) {
  const pairKey = getDemoPairKey(event);
  if (!pairKey) return false;
  const eventTime = getEventTimeSeconds(event);
  return keptRawDemoEvents.some((keptEvent) => {
    if (keptEvent.type !== event.type) return false;
    if (getDemoPairKey(keptEvent) !== pairKey) return false;
    return Math.abs(getEventTimeSeconds(keptEvent) - eventTime) <= windowSeconds;
  });
}

function isCounterCoveredByRawDemo(event, rawDemoEvents, windowSeconds = 3) {
  if (event.source !== "pri-counter") return false;
  if (event.type !== "kill" && event.type !== "death") return false;
  const eventTime = getEventTimeSeconds(event);
  return rawDemoEvents.some((rawEvent) => {
    if (rawEvent.type !== event.type) return false;
    if (rawEvent.type === "kill" && rawEvent.playerName !== event.playerName) return false;
    if (rawEvent.type === "death" && rawEvent.playerName !== event.playerName) return false;
    return Math.abs(getEventTimeSeconds(rawEvent) - eventTime) <= windowSeconds;
  });
}

function dedupeTimelineEvents(events) {
  const keptRawDemoEvents = [];
  const deduped = [];
  for (const event of events) {
    if (event.source === "replicated-demolish" && (event.type === "kill" || event.type === "death")) {
      if (isDuplicateRawDemoEvent(event, keptRawDemoEvents)) continue;
      keptRawDemoEvents.push(event);
      deduped.push(event);
      continue;
    }
    deduped.push(event);
  }
  return deduped.filter((event) => !isCounterCoveredByRawDemo(event, keptRawDemoEvents));
}

function buildInitialPlayerSummary(headerPlayers) {
  return new Map(
    headerPlayers.map((player) => [
      player.Name,
      { playerName: player.Name, team: player.Team ?? null, goals: 0, shots: 0, saves: 0, assists: 0, kills: 0, deaths: 0 },
    ]),
  );
}

function buildPlayerSummary(headerPlayers, events) {
  const playerSummary = buildInitialPlayerSummary(headerPlayers);
  for (const event of events) {
    if (!event.playerName) continue;
    incrementPlayerSummary(playerSummary, event.playerName, event.team, event.type);
  }
  return playerSummary;
}

export function extractGameTimeline(replay) {
  const frames = replay.network_frames?.frames ?? [];
  const objects = replay.objects ?? [];
  const names = replay.names ?? [];

  const frameTimes = frames.map((frame) => frame.time).filter((time) => typeof time === "number");
  const firstFrameTime = frameTimes.length ? Math.min(...frameTimes) : 0;

  const headerPlayers = replay.properties?.PlayerStats ?? [];
  const headerPlayersByName = new Map(headerPlayers.map((p) => [p.Name, p]));

  const activeActors = new Map();
  const priInfo = new Map();
  const carToPri = new Map();
  const teamActorToIndex = new Map();
  const lastCounterByPlayerAndStat = new Map();
  const clockSamples = [];
  const stateSamples = [];
  let clockZeroElapsedSeconds = null;
  const timelineEvents = [];
  const playerSummary = buildInitialPlayerSummary(headerPlayers);
  const demoSignalCounts = new Map();
  const rawDemoEvents = [];
  const fallbackDemoEventKeys = new Set();

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
        (info?.teamActorId !== null && info?.teamActorId !== undefined
          ? (teamActorToIndex.get(info.teamActorId) ?? null)
          : null),
    };
  }

  function addCounterEvents({ frameIndex, replayTime, priActorId, eventConfig, counterValue, clockSample, initialClockSeconds }) {
    const { playerName, team } = resolvePlayer(priActorId);
    const counterKey = `${playerName}|${eventConfig.statKey}`;
    const previousCounter = lastCounterByPlayerAndStat.get(counterKey) ?? 0;
    if (counterValue <= previousCounter) return;
    for (let value = previousCounter + 1; value <= counterValue; value++) {
      const event = {
        ...createEventBase({ type: eventConfig.type, frameIndex, replayTime, firstFrameTime, clockSample, initialClockSeconds, clockZeroElapsedSeconds, source: "pri-counter" }),
        playerName, team, counterValue: value,
      };
      event.id = `${event.type}-${frameIndex}-${playerName}-${value}`;
      timelineEvents.push(event);
      incrementPlayerSummary(playerSummary, playerName, team, event.type);
    }
    lastCounterByPlayerAndStat.set(counterKey, counterValue);
  }

  function resolvePriFromReferencedNumbers(numbers) {
    for (const number of numbers) {
      if (priInfo.has(number)) return number;
      const mappedPri = carToPri.get(number);
      if (mappedPri !== undefined) return mappedPri;
    }
    return null;
  }

  function addRawDemolishFallbackEvents({ frameIndex, replayTime, victimCarActorId, updateObjectName, attribute, clockSample, initialClockSeconds }) {
    const victimPriActorId = carToPri.get(victimCarActorId);
    if (victimPriActorId === undefined) return;
    const numbers = findNumbers(attribute).filter((number) => number !== victimCarActorId);
    const attackerPriActorId = resolvePriFromReferencedNumbers(numbers);
    const victim = resolvePlayer(victimPriActorId);
    const attacker = attackerPriActorId !== null ? resolvePlayer(attackerPriActorId) : null;
    const eventKey = `${frameIndex}|${victim.playerName}|${attacker?.playerName ?? "unknown"}`;
    if (fallbackDemoEventKeys.has(eventKey)) return;
    fallbackDemoEventKeys.add(eventKey);

    rawDemoEvents.push({
      frameIndex, replayTimeSeconds: roundSeconds(replayTime), updateObjectName,
      victimCarActorId, victimPriActorId, victimPlayerName: victim.playerName, victimTeam: victim.team,
      attackerPriActorId, attackerPlayerName: attacker?.playerName ?? null, attackerTeam: attacker?.team ?? null, attribute,
    });

    if (attacker) {
      const killEvent = {
        ...createEventBase({ type: "kill", frameIndex, replayTime, firstFrameTime, clockSample, initialClockSeconds, clockZeroElapsedSeconds, source: "replicated-demolish" }),
        playerName: attacker.playerName, team: attacker.team,
        victimPlayerName: victim.playerName, victimTeam: victim.team,
      };
      killEvent.id = `kill-${frameIndex}-${attacker.playerName}-${victim.playerName}`;
      timelineEvents.push(killEvent);
      incrementPlayerSummary(playerSummary, attacker.playerName, attacker.team, "kill");
    }

    const deathEvent = {
      ...createEventBase({ type: "death", frameIndex, replayTime, firstFrameTime, clockSample, initialClockSeconds, clockZeroElapsedSeconds, source: "replicated-demolish" }),
      playerName: victim.playerName, team: victim.team,
      killerPlayerName: attacker?.playerName ?? null, killerTeam: attacker?.team ?? null,
    };
    deathEvent.id = `death-${frameIndex}-${victim.playerName}-${attacker?.playerName ?? "unknown"}`;
    timelineEvents.push(deathEvent);
    incrementPlayerSummary(playerSummary, victim.playerName, victim.team, "death");
  }

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const replayTime = frame.time ?? frameIndex;

    for (const actor of frame.new_actors ?? []) {
      const actorId = getActorId(actor);
      if (actorId === null) continue;
      const objectName = getObjectName(actor, objects, names);
      activeActors.set(actorId, { actorId, objectName });
      if (objectName === PRI_OBJECT_NAME) ensurePri(actorId);
    }

    let latestClockSample = clockSamples.length > 0 ? clockSamples[clockSamples.length - 1] : null;

    for (const update of frame.updated_actors ?? []) {
      const actorId = getActorId(update);
      if (actorId === null) continue;
      const activeActor = activeActors.get(actorId);
      if (!activeActor) continue;
      const activeObjectName = activeActor.objectName;
      const updateObjectName = getObjectName(update, objects, names);
      const attribute = update.attribute ?? {};

      if (DEMO_SIGNAL_NAMES.has(updateObjectName)) incrementMapCount(demoSignalCounts, updateObjectName);

      if (updateObjectName === "TAGame.GameEvent_Soccar_TA:SecondsRemaining") {
        const secondsRemaining = extractCounterValue(attribute);
        if (typeof secondsRemaining === "number") {
          latestClockSample = { frameIndex, replayTime, gameSecondsRemaining: secondsRemaining };
          clockSamples.push(latestClockSample);
          if (secondsRemaining === 0 && clockZeroElapsedSeconds === null) {
            clockZeroElapsedSeconds = replayTime - firstFrameTime;
          }
        }
      }

      if (updateObjectName === STATE_NAME_UPDATE) {
        const stateNameId = extractCounterValue(attribute);
        const stateName = getNameValue(names, objects, stateNameId);
        if (stateName && stateSamples[stateSamples.length - 1]?.stateName !== stateName) {
          stateSamples.push({ frameIndex, replayTime, elapsedSeconds: roundSeconds(replayTime - firstFrameTime), stateName });
        }
      }

      if (updateObjectName === "Engine.TeamInfo:TeamIndex") {
        const nums = findNumbers(attribute);
        const teamIndex = nums.find((num) => num === 0 || num === 1);
        if (teamIndex !== undefined) teamActorToIndex.set(actorId, teamIndex);
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
          if (info.team === null && directTeam !== undefined) info.team = directTeam;
        }

        const eventConfig = COUNTER_EVENTS.get(updateObjectName);
        if (eventConfig) {
          const counterValue = extractCounterValue(attribute);
          const initialClockSeconds = deriveInitialClockSeconds(clockSamples, 300);
          if (typeof counterValue === "number") {
            addCounterEvents({ frameIndex, replayTime, priActorId: actorId, eventConfig, counterValue, clockSample: latestClockSample, initialClockSeconds });
          }
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

      if (activeObjectName === CAR_OBJECT_NAME && DEMO_UPDATE_NAMES.has(updateObjectName)) {
        const initialClockSeconds = deriveInitialClockSeconds(clockSamples, 300);
        addRawDemolishFallbackEvents({ frameIndex, replayTime, victimCarActorId: actorId, updateObjectName, attribute, clockSample: latestClockSample, initialClockSeconds });
      }
    }

    for (const deleted of frame.deleted_actors ?? []) {
      const deletedId = typeof deleted === "number" ? deleted : getActorId(deleted);
      if (deletedId === null || deletedId === undefined) continue;
      const activeActor = activeActors.get(deletedId);
      if (activeActor?.objectName === CAR_OBJECT_NAME) {
        carToPri.delete(deletedId);
      } else if (activeActor?.objectName === PRI_OBJECT_NAME) {
        for (const [carActorId, priActorId] of carToPri.entries()) {
          if (priActorId === deletedId) carToPri.delete(carActorId);
        }
      }
      activeActors.delete(deletedId);
    }
  }

  const initialClockSeconds = deriveInitialClockSeconds(clockSamples);

  const goals = replay.properties?.Goals ?? [];
  const scoreByTeam = new Map([[0, 0], [1, 0]]);

  for (const goal of goals) {
    const frameIndex = goal.frame ?? null;
    const frame = typeof frameIndex === "number" ? frames[frameIndex] : null;
    const replayTime = frame?.time ?? null;
    const clockSample = typeof frameIndex === "number" ? findClockAtFrame(clockSamples, frameIndex) : null;
    const team = goal.PlayerTeam ?? null;
    if (team !== null) scoreByTeam.set(team, (scoreByTeam.get(team) ?? 0) + 1);
    const event = {
      ...createEventBase({ type: "goal", frameIndex, replayTime, firstFrameTime, clockSample, initialClockSeconds, clockZeroElapsedSeconds, source: "replay-header" }),
      playerName: goal.PlayerName ?? "UNKNOWN",
      team,
      scoreAfter: { team0: scoreByTeam.get(0) ?? 0, team1: scoreByTeam.get(1) ?? 0 },
    };
    event.id = `goal-${frameIndex}-${event.playerName}-${event.scoreAfter.team0}-${event.scoreAfter.team1}`;
    timelineEvents.push(event);
    incrementPlayerSummary(playerSummary, event.playerName, team, "goal");
  }

  const eventTypeOrder = new Map([["goal", 0], ["shot", 1], ["save", 2], ["assist", 3], ["kill", 4], ["death", 5]]);
  timelineEvents.sort((a, b) => {
    const timeA = a.replayTimeSeconds ?? Number.POSITIVE_INFINITY;
    const timeB = b.replayTimeSeconds ?? Number.POSITIVE_INFINITY;
    if (timeA !== timeB) return timeA - timeB;
    return (eventTypeOrder.get(a.type) ?? 99) - (eventTypeOrder.get(b.type) ?? 99);
  });

  const dedupedTimelineEvents = dedupeTimelineEvents(timelineEvents);
  const finalFrameElapsedSeconds = frameTimes.length > 0 ? Math.max(...frameTimes) - firstFrameTime : null;
  const isForfeit = replay.properties?.bForfeit === true;
  const totalSecondsPlayed = replay.properties?.TotalSecondsPlayed ?? null;
  const overtimeStartSample = findOvertimeStartSample(clockSamples);
  const isOvertime =
    overtimeStartSample !== null ||
    (typeof totalSecondsPlayed === "number" &&
      typeof initialClockSeconds === "number" &&
      totalSecondsPlayed > initialClockSeconds + 5);
  const useMatchClockTimeline = isForfeit || isOvertime;
  const ignoredCountdownIntervals = buildCountdownIntervals(stateSamples, finalFrameElapsedSeconds);

  if (isOvertime) {
    applyOvertimeClockElapsed(dedupedTimelineEvents, overtimeStartSample, initialClockSeconds);
  }

  for (const event of dedupedTimelineEvents) {
    event.timelineElapsedSeconds =
      useMatchClockTimeline && typeof event.gameClockElapsedSeconds === "number"
        ? clampElapsedSeconds(event.gameClockElapsedSeconds, totalSecondsPlayed)
        : timelineElapsedSeconds(event.elapsedSeconds, ignoredCountdownIntervals);
    event.timelineElapsedClock = formatClock(event.timelineElapsedSeconds);
  }

  const timelineDurationSeconds =
    useMatchClockTimeline && typeof totalSecondsPlayed === "number"
      ? roundSeconds(totalSecondsPlayed)
      : ceilToNearest(
          timelineElapsedSeconds(finalFrameElapsedSeconds, ignoredCountdownIntervals),
          20,
        );

  const dedupedPlayerSummary = buildPlayerSummary(headerPlayers, dedupedTimelineEvents);

  return {
    replayName: replay.properties?.ReplayName ?? null,
    replayId: replay.properties?.Id ?? null,
    mapName: replay.properties?.MapName ?? null,
    overtime: isOvertime,
    forfeit: isForfeit,
    totalSecondsPlayed,
    timelineSecondsPlayed: timelineDurationSeconds,
    rawReplaySecondsPlayed: roundSeconds(finalFrameElapsedSeconds),
    notes: [
      "Goals come from replay.properties.Goals frame references.",
      "Shots, saves and assists come from replicated PRI counter increases.",
      "Kills and deaths come from PRI demolition/death counter increases, with a fallback for ReplicatedDemolish car updates.",
      "Times are exact to the parsed network frame. Game clock fields are derived from SecondsRemaining updates when available.",
      "timelineElapsedSeconds removes inter-round countdown dead time after the initial kickoff so the visual rail matches replay timeline placement more closely.",
      "For forfeits and overtime, timelineElapsedSeconds uses the replay header match clock so the rail duration matches the in-game result screen.",
      "When only counter data exists, kill and death markers may be separate instead of paired attacker-victim demo events.",
    ],
    diagnostics: {
      demoSignalCounts: Object.fromEntries(
        [...demoSignalCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
      rawDemoEvents,
      demoNote:
        demoSignalCounts.size === 0
          ? "No demolition/death update signals were present in this parsed replay."
          : null,
    },
    timeBasis: {
      firstFrameTime,
      initialClockSeconds,
      overtimeStartFrame: overtimeStartSample?.frameIndex ?? null,
      overtimeStartReplayTimeSeconds: roundSeconds(overtimeStartSample?.replayTime),
      ignoredCountdownIntervals,
      clockPlaybackSamples: buildClockPlaybackSamples({
        clockSamples, firstFrameTime, initialClockSeconds, clockZeroElapsedSeconds, totalSecondsPlayed,
      }),
    },
    playerCount: playerSummary.size,
    eventCount: dedupedTimelineEvents.length,
    players: [...dedupedPlayerSummary.values()].sort((a, b) => {
      if (a.team !== b.team) return (a.team ?? 99) - (b.team ?? 99);
      return a.playerName.localeCompare(b.playerName);
    }),
    events: dedupedTimelineEvents,
  };
}

async function main() {
  const replayBuffer = await fs.readFile(NETWORK_JSON_PATH);
  const replay = readJsonFileSafe(replayBuffer);
  const output = extractGameTimeline(replay);

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log("\nGame timeline:");
  console.table(
    output.events.map((event) => ({
      Time: event.timelineElapsedClock,
      RawTime: event.elapsedClock,
      Clock: event.gameClockRemaining,
      Type: event.type,
      Player: event.playerName,
      Team: event.team,
      Score: event.scoreAfter !== undefined ? `${event.scoreAfter.team0}-${event.scoreAfter.team1}` : "",
    })),
  );

  console.log(`\nSaved game timeline to: ${OUTPUT_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to extract game timeline:");
    console.error(error);
    process.exit(1);
  });
}
