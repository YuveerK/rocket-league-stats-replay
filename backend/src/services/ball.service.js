import { readOutput } from "../repositories/output.repository.js";
import { pct } from "../utils/format.js";
import {
  BALL_MIDFIELD_BAND_Y,
  BALL_DEF_THIRD,
  BALL_ATT_THIRD,
  BALL_GROUND_Z,
  BALL_HIGH_AERIAL_Z,
  BALL_MEDIUM_SPEED,
  BALL_FAST_SPEED,
  BALL_SUPERSONIC_SPEED,
  BALL_PRESSURE_BUCKET_SECONDS,
} from "../config/constants.js";

function createPressureBucket(index) {
  const start = index * BALL_PRESSURE_BUCKET_SECONDS;
  return { start, end: start + BALL_PRESSURE_BUCKET_SECONDS, blueSeconds: 0, orangeSeconds: 0, midfieldSeconds: 0 };
}

function buildBallDerivedStats(samples) {
  const stats = {
    pressure: { bluePressurePct: 0, orangePressurePct: 0, neutralPct: 0, bluePressureSeconds: 0, orangePressureSeconds: 0, neutralSeconds: 0 },
    territory: { blueHalfPct: 0, midfieldPct: 0, orangeHalfPct: 0, blueThirdPct: 0, midfieldThirdPct: 0, orangeThirdPct: 0 },
    speedBands: { slowPct: 0, mediumPct: 0, fastPct: 0, supersonicBallPct: 0 },
    heightBands: { groundPct: 0, lowAerialPct: 0, highAerialPct: 0 },
    pressureTimeline: [],
    matchDuration: 0,
  };

  if (!Array.isArray(samples) || samples.length === 0) return stats;

  let pressureBlue = 0, pressureOrange = 0, pressureNeutral = 0;
  let blueHalf = 0, midfield = 0, orangeHalf = 0;
  let blueThird = 0, midfieldThird = 0, orangeThird = 0;
  let slow = 0, medium = 0, fast = 0, supersonic = 0;
  let ground = 0, lowAerial = 0, highAerial = 0;
  let total = 0;
  const buckets = new Map();
  const maxElapsed = Math.max(0, ...samples.map((s) => s.elapsedSeconds ?? 0));

  for (let i = 0; i < samples.length - 1; i++) {
    const sample = samples[i];
    const next = samples[i + 1];
    const duration = Math.max(0, (next.elapsedSeconds ?? 0) - (sample.elapsedSeconds ?? 0));
    if (duration <= 0 || duration > 2) continue;

    const y = sample.y ?? 0;
    const z = sample.z ?? 0;
    const speed = sample.speedUU ?? 0;
    total += duration;

    if (y > 0) pressureBlue += duration;
    else if (y < 0) pressureOrange += duration;
    else pressureNeutral += duration;

    if (y < -BALL_MIDFIELD_BAND_Y) blueHalf += duration;
    else if (y > BALL_MIDFIELD_BAND_Y) orangeHalf += duration;
    else midfield += duration;

    if (y < BALL_DEF_THIRD) blueThird += duration;
    else if (y > BALL_ATT_THIRD) orangeThird += duration;
    else midfieldThird += duration;

    if (speed >= BALL_SUPERSONIC_SPEED) supersonic += duration;
    else if (speed >= BALL_FAST_SPEED) fast += duration;
    else if (speed >= BALL_MEDIUM_SPEED) medium += duration;
    else slow += duration;

    if (z <= BALL_GROUND_Z) ground += duration;
    else if (z <= BALL_HIGH_AERIAL_Z) lowAerial += duration;
    else highAerial += duration;

    const bucketIndex = Math.floor((sample.elapsedSeconds ?? 0) / BALL_PRESSURE_BUCKET_SECONDS);
    const bucket = buckets.get(bucketIndex) ?? createPressureBucket(bucketIndex);
    if (y > 0) bucket.blueSeconds += duration;
    else if (y < 0) bucket.orangeSeconds += duration;
    else bucket.midfieldSeconds += duration;
    buckets.set(bucketIndex, bucket);
  }

  stats.pressure = {
    bluePressurePct: pct(pressureBlue, total),
    orangePressurePct: pct(pressureOrange, total),
    neutralPct: pct(pressureNeutral, total),
    bluePressureSeconds: Number(pressureBlue.toFixed(2)),
    orangePressureSeconds: Number(pressureOrange.toFixed(2)),
    neutralSeconds: Number(pressureNeutral.toFixed(2)),
  };
  stats.territory = {
    blueHalfPct: pct(blueHalf, total),
    midfieldPct: pct(midfield, total),
    orangeHalfPct: pct(orangeHalf, total),
    blueThirdPct: pct(blueThird, total),
    midfieldThirdPct: pct(midfieldThird, total),
    orangeThirdPct: pct(orangeThird, total),
  };
  stats.speedBands = {
    slowPct: pct(slow, total),
    mediumPct: pct(medium, total),
    fastPct: pct(fast, total),
    supersonicBallPct: pct(supersonic, total),
  };
  stats.heightBands = {
    groundPct: pct(ground, total),
    lowAerialPct: pct(lowAerial, total),
    highAerialPct: pct(highAerial, total),
  };
  stats.pressureTimeline = [...buckets.values()]
    .sort((a, b) => a.start - b.start)
    .map((bucket) => {
      const bucketTotal = bucket.blueSeconds + bucket.orangeSeconds + bucket.midfieldSeconds;
      return {
        start: bucket.start,
        end: bucket.end,
        label: `${Math.floor(bucket.start / 60)}:${String(bucket.start % 60).padStart(2, "0")}`,
        bluePressurePct: pct(bucket.blueSeconds, bucketTotal),
        orangePressurePct: pct(bucket.orangeSeconds, bucketTotal),
        midfieldPct: pct(bucket.midfieldSeconds, bucketTotal),
        dominant:
          bucket.blueSeconds > bucket.orangeSeconds ? "blue"
          : bucket.orangeSeconds > bucket.blueSeconds ? "orange"
          : "neutral",
      };
    });
  stats.matchDuration = Number(maxElapsed.toFixed(2));

  return stats;
}

export async function getBallData() {
  const [ballStats, ballTimeline, matchMeta] = await Promise.all([
    readOutput("ball-stats.json"),
    readOutput("ball-position-timeline.json"),
    readOutput("match-meta.json"),
  ]);

  if (!ballStats && !ballTimeline) return null;

  const samples = ballTimeline?.samples ?? [];
  const derived = buildBallDerivedStats(samples);

  return {
    replayName: ballStats?.replayName ?? ballTimeline?.replayName ?? null,
    matchDuration: matchMeta?.totalSecondsPlayed ?? derived.matchDuration,
    fieldBounds: ballTimeline?.fieldBounds ?? { minX: -4096, maxX: 4096, minY: -5120, maxY: 5120 },
    possession: ballStats?.possession ?? null,
    ballSpeed: ballStats?.ballSpeed ?? null,
    ballAerial: ballStats?.ballAerial ?? null,
    sampleCount: samples.length,
    samples,
    pressure: derived.pressure,
    territory: derived.territory,
    speedBands: derived.speedBands,
    heightBands: derived.heightBands,
    pressureTimeline: derived.pressureTimeline,
  };
}
