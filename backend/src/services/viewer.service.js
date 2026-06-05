import {
  CANONICAL_BOOST_PAD_SNAP_DISTANCE,
  STANDARD_SOCCAR_BOOST_PADS,
} from "../config/constants.js";
import { readReplayArtifacts } from "../repositories/artifact.repository.js";
import { watchNumber, watchRound } from "../utils/format.js";

function snapBoostPadIndex(location) {
  if (!location) return null;

  const x = Number(location.x);
  const y = Number(location.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  let bestIndex = null;
  let bestDistance = CANONICAL_BOOST_PAD_SNAP_DISTANCE;

  for (const pad of STANDARD_SOCCAR_BOOST_PADS) {
    const distance = Math.hypot(x - pad.x, y - pad.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = pad.index;
    }
  }

  return bestIndex;
}

function timelineOriginFromSamples(samples) {
  const first = samples?.[0];
  if (!first) return null;

  const time = Number(first.time);
  const elapsed = Number(first.elapsedSeconds);
  if (!Number.isFinite(time) || !Number.isFinite(elapsed)) return null;

  return time - elapsed;
}

function deriveWatchMatchStartSeconds(positions, ballTimeline, pickupStats, timeline) {
  const fromPickup = finiteNumber(pickupStats?.matchStart);
  if (fromPickup !== null) return fromPickup;

  const fromTimeline = finiteNumber(timeline?.timeBasis?.matchStartSeconds);
  if (fromTimeline !== null) return fromTimeline;

  const origins = [];
  for (const player of positions?.players ?? []) {
    const origin = timelineOriginFromSamples(player.samples);
    if (origin !== null) origins.push(origin);
  }

  const ballOrigin = timelineOriginFromSamples(ballTimeline?.samples);
  if (ballOrigin !== null) origins.push(ballOrigin);

  if (origins.length) return Math.min(...origins);
  return 0;
}

function buildWatchBoostPickups(pickupStats, matchStartSeconds) {
  const start = Number(matchStartSeconds);
  if (!Number.isFinite(start)) return [];

  const seenPadSecond = new Set();

  return (pickupStats?.events ?? [])
    .map((event) => {
      const location = event.carLocationAtPickup ?? event.location;
      const padIndex = snapBoostPadIndex(location);
      if (padIndex === null) return null;

      const pad = STANDARD_SOCCAR_BOOST_PADS[padIndex];
      const padType =
        event.padType === "big" || event.padType === "small"
          ? event.padType
          : pad?.padType ?? "small";

      const seconds = watchRound(Number(event.time) - start, 3);
      const dedupeKey = `${padIndex}|${seconds}`;
      if (seenPadSecond.has(dedupeKey)) return null;
      seenPadSecond.add(dedupeKey);

      return {
        padIndex,
        seconds,
        padType,
        playerName: event.playerName ?? null,
        x: location?.x ?? pad?.x,
        y: location?.y ?? pad?.y,
      };
    })
    .filter(Boolean);
}

function compactWatchSample(sample) {
  const row = [
    Math.round(watchNumber(sample.elapsedSeconds) * 100),
    watchRound(sample.x),
    watchRound(sample.y),
    watchRound(sample.z),
  ];

  const quaternion = [sample.qx, sample.qy, sample.qz, sample.qw].map(Number);
  if (quaternion.every(Number.isFinite)) {
    row.push(
      watchRound(quaternion[0], 6),
      watchRound(quaternion[1], 6),
      watchRound(quaternion[2], 6),
      watchRound(quaternion[3], 6),
    );

    const velocity = [sample.vx, sample.vy, sample.vz].map(Number);
    if (velocity.every(Number.isFinite)) {
      row.push(watchRound(velocity[0]), watchRound(velocity[1]), watchRound(velocity[2]));
      const boost = Number(sample.boostAmount);
      if (Number.isFinite(boost)) row.push(Math.round(boost));
      const throttle = Number(sample.throttle);
      if (Number.isFinite(throttle)) row.push(Math.round(throttle));
    }
  }

  return row;
}

function maxSampleCsecs(samples) {
  return samples.reduce((max, s) => Math.max(max, s[0] ?? 0), 0);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compactTimePoint(playbackSeconds, rawSeconds) {
  const playback = finiteNumber(playbackSeconds);
  const raw = finiteNumber(rawSeconds);
  if (playback === null || raw === null) return null;
  return [
    Math.max(0, Math.round(playback * 100)),
    Math.max(0, Math.round(raw * 100)),
  ];
}

function pushTimePoint(points, playbackSeconds, rawSeconds) {
  const point = compactTimePoint(playbackSeconds, rawSeconds);
  if (!point) return;

  const previous = points[points.length - 1];
  if (previous) {
    if (point[0] === previous[0]) {
      previous[1] = Math.max(previous[1], point[1]);
      return;
    }
    if (point[0] < previous[0] || point[1] < previous[1]) return;
  }

  points.push(point);
}

function eventPlaybackSeconds(event) {
  return (
    finiteNumber(event?.timelineElapsedSeconds) ??
    finiteNumber(event?.gameClockElapsedSeconds) ??
    finiteNumber(event?.elapsedSeconds)
  );
}

function hasCompressedJump(points) {
  for (let index = 1; index < points.length; index++) {
    const [previousPlayback, previousRaw] = points[index - 1];
    const [playback, raw] = points[index];
    const playbackDelta = (playback - previousPlayback) / 100;
    const rawDelta = (raw - previousRaw) / 100;

    if (playbackDelta <= 0 || rawDelta < 0) return true;
    if (rawDelta > 4 && rawDelta / playbackDelta > 2.5) return true;
  }

  return false;
}

function buildWatchTimeMapping(timeline, rawPlaybackDuration, activeDuration) {
  const rawDuration = finiteNumber(rawPlaybackDuration);
  const targetDuration = finiteNumber(activeDuration);
  if (rawDuration === null || targetDuration === null) return [];
  if (rawDuration - targetDuration < 5) return [];

  const points = [];
  pushTimePoint(points, 0, 0);

  const clockSamples = timeline?.timeBasis?.clockPlaybackSamples ?? [];
  for (const sample of clockSamples) {
    pushTimePoint(points, sample.playbackSeconds, sample.rawElapsedSeconds);
  }

  if (points.length <= 1) return [];

  const last = points[points.length - 1];
  const targetCsecs = Math.round(targetDuration * 100);
  if (targetCsecs > last[0]) {
    const lastPlaybackSeconds = last[0] / 100;
    const lastRawSeconds = last[1] / 100;
    const rawSeconds =
      targetDuration - lastPlaybackSeconds <= 2
        ? lastRawSeconds
        : rawDuration;
    pushTimePoint(points, targetDuration, rawSeconds);
  }

  if (hasCompressedJump(points)) return [];

  return points;
}

function buildWatchResetSegments(timeline) {
  const goals = (timeline?.events ?? [])
    .filter((e) => e.type === "goal" && Number.isFinite(Number(e.elapsedSeconds)))
    .map((e) => ({ id: e.id, elapsedSeconds: Number(e.elapsedSeconds) }))
    .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);

  const intervals = timeline?.timeBasis?.ignoredCountdownIntervals ?? [];

  return intervals
    .map((interval) => {
      const start = Number(interval.start);
      const end = Number(interval.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

      let goal = null;
      for (const candidate of goals) {
        if (candidate.elapsedSeconds < start) goal = candidate;
        else break;
      }
      if (!goal) return null;

      return {
        goalId: goal.id,
        goalElapsedSeconds: watchRound(goal.elapsedSeconds, 3),
        countdownStartSeconds: watchRound(start, 3),
        countdownEndSeconds: watchRound(end, 3),
      };
    })
    .filter(Boolean);
}

export async function getWatchData({ replayId = null } = {}) {
  const [positions, ballTimeline, finalStats, timeline, matchMeta, playerMapping, pickupStats] =
    await readReplayArtifacts(
      [
        "player-position-timeline.json",
        "ball-position-timeline.json",
        "final-player-stats.json",
        "game-timeline.json",
        "match-meta.json",
        "player-mapping.json",
        "boost-pickup-stats-v2.json",
      ],
      { replayId },
    );

  if (!positions || !ballTimeline) return null;

  const platformByName = new Map(
    (playerMapping?.players ?? []).map((p) => [p.playerName, p.platform]),
  );

  const players = (positions.players ?? [])
    .map((player) => {
      const samples = (player.samples ?? []).map(compactWatchSample);
      return {
        playerName: player.playerName,
        team: player.team,
        platform: platformByName.get(player.playerName) ?? null,
        sampleCount: samples.length,
        samples,
      };
    })
    .filter((p) => p.sampleCount > 0);

  const ballSamples = (ballTimeline.samples ?? []).map(compactWatchSample);
  const playbackCsecs = Math.max(
    maxSampleCsecs(ballSamples),
    ...players.map((p) => maxSampleCsecs(p.samples)),
  );
  const rawPlaybackDuration = playbackCsecs / 100;
  const activeDuration =
    finiteNumber(timeline?.timelineSecondsPlayed) ??
    finiteNumber(finalStats?.totalSecondsPlayed) ??
    finiteNumber(matchMeta?.totalSecondsPlayed);
  const timeMapping = buildWatchTimeMapping(
    timeline,
    rawPlaybackDuration,
    activeDuration,
  );
  const hasTimeMapping = timeMapping.length > 1;
  const playbackDuration =
    hasTimeMapping
      ? timeMapping[timeMapping.length - 1][0] / 100
      : rawPlaybackDuration;
  const scoreTeam0 = (finalStats?.players ?? [])
    .filter((p) => p.team === 0)
    .reduce((sum, p) => sum + watchNumber(p.goals), 0);
  const scoreTeam1 = (finalStats?.players ?? [])
    .filter((p) => p.team === 1)
    .reduce((sum, p) => sum + watchNumber(p.goals), 0);

  return {
    match: {
      replayName: finalStats?.replayName ?? positions.replayName ?? ballTimeline.replayName ?? null,
      replayId: finalStats?.replayId ?? positions.replayId ?? null,
      mapName: finalStats?.mapName ?? positions.mapName ?? matchMeta?.mapName ?? null,
      date: finalStats?.date ?? matchMeta?.date ?? null,
      totalSecondsPlayed: finalStats?.totalSecondsPlayed ?? matchMeta?.totalSecondsPlayed ?? null,
      playbackDuration,
      rawPlaybackDuration,
      scoreTeam0,
      scoreTeam1,
      teamSize: finalStats?.teamSize ?? matchMeta?.teamSize ?? null,
      playlist: finalStats?.playlist ?? matchMeta?.playlist ?? null,
      serverRegion: finalStats?.serverRegion ?? matchMeta?.serverRegion ?? null,
    },
    fieldBounds: positions.fieldBounds ?? ballTimeline.fieldBounds ?? {
      minX: -4096, maxX: 4096, minY: -5120, maxY: 5120,
    },
    players,
    ball: { sampleCount: ballSamples.length, samples: ballSamples },
    resetSegments: buildWatchResetSegments(timeline),
    timeMapping,
    events: (timeline?.events ?? [])
      .filter((e) => ["goal", "shot", "save", "assist", "kill", "death"].includes(e.type))
      .map((e) => ({
        id: e.id,
        type: e.type,
        elapsedSeconds: e.elapsedSeconds,
        playbackSeconds: hasTimeMapping ? eventPlaybackSeconds(e) : e.elapsedSeconds,
        playerName: e.playerName,
        victimPlayerName: e.victimPlayerName ?? null,
        team: e.team ?? null,
        scoreAfter: e.scoreAfter ?? null,
      })),
    hasRecordedRotation: players.some((p) => p.samples.some((s) => s.length >= 8)),
    boostPickups: buildWatchBoostPickups(
      pickupStats,
      deriveWatchMatchStartSeconds(positions, ballTimeline, pickupStats, timeline),
    ),
  };
}
