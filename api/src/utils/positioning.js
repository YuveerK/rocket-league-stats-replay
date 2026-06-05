import {
  BALL_ATT_THIRD,
  BALL_DEF_THIRD,
} from "../config/constants.js";

export const FIELD_BOUNDS = {
  minX: -4096,
  maxX: 4096,
  minY: -5120,
  maxY: 5120,
};

/** Team-relative Y: positive = toward opponent goal. */
export function teamRelativeY(team, y) {
  return team === 1 ? -y : y;
}

export function isDefensiveThird(team, y) {
  return teamRelativeY(team, y) < BALL_DEF_THIRD;
}

export function isMidfieldThird(team, y) {
  const rel = teamRelativeY(team, y);
  return rel >= BALL_DEF_THIRD && rel < BALL_ATT_THIRD;
}

export function isAttackingThird(team, y) {
  return teamRelativeY(team, y) >= BALL_ATT_THIRD;
}

export function isOwnHalf(team, y) {
  return team === 0 ? y < 0 : y > 0;
}

/** Player is between ball and own goal. */
export function isBehindBall(team, carY, ballY) {
  if (carY == null || ballY == null) return false;
  return team === 0 ? carY < ballY : carY > ballY;
}

function distance2D(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function latestBallBefore(ballSamples, elapsedSeconds) {
  if (!ballSamples?.length || elapsedSeconds == null) return null;
  let lo = 0;
  let hi = ballSamples.length - 1;
  let best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const sample = ballSamples[mid];
    const t = sample.elapsedSeconds ?? 0;
    if (t <= elapsedSeconds) {
      best = sample;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function computePlayerZones(player) {
  const samples = player.samples ?? [];
  const total = samples.length || 1;
  let defTime = 0;
  let midTime = 0;
  let attTime = 0;
  let aerialTime = 0;

  for (const s of samples) {
    const y = s.y ?? 0;
    if (isDefensiveThird(player.team, y)) defTime++;
    else if (isAttackingThird(player.team, y)) attTime++;
    else midTime++;
    if ((s.z ?? 0) > 100) aerialTime++;
  }

  return {
    defPct: Math.round((defTime / total) * 100),
    midPct: Math.round((midTime / total) * 100),
    attPct: Math.round((attTime / total) * 100),
    aerialPct: Math.round((aerialTime / total) * 100),
    groundPct: Math.round(((total - aerialTime) / total) * 100),
    defSeconds: Number((defTime * 0.033).toFixed(1)),
    midSeconds: Number((midTime * 0.033).toFixed(1)),
    attSeconds: Number((attTime * 0.033).toFixed(1)),
  };
}

export function computePositioningMetrics(player, ballSamples) {
  const samples = player.samples ?? [];
  if (!samples.length) {
    return {
      avgDistanceToBallUU: null,
      closestToBallUU: null,
      behindBallPct: null,
      behindBallOwnHalfPct: null,
      sampleCount: 0,
    };
  }

  let distSum = 0;
  let distCount = 0;
  let closest = Infinity;
  let behindCount = 0;
  let behindOwnHalfCount = 0;
  let behindOwnHalfSamples = 0;

  for (const s of samples) {
    const ball = latestBallBefore(ballSamples, s.elapsedSeconds);
    if (!ball || ball.x == null || ball.y == null) continue;

    const dist = distance2D(s.x, s.y, ball.x, ball.y);
    distSum += dist;
    distCount++;
    if (dist < closest) closest = dist;

    if (isBehindBall(player.team, s.y, ball.y)) {
      behindCount++;
      if (isOwnHalf(player.team, s.y)) {
        behindOwnHalfCount++;
        behindOwnHalfSamples++;
      }
    } else if (isOwnHalf(player.team, s.y)) {
      behindOwnHalfSamples++;
    }
  }

  const total = samples.length;
  return {
    avgDistanceToBallUU: distCount > 0 ? Math.round(distSum / distCount) : null,
    closestToBallUU: Number.isFinite(closest) ? Math.round(closest) : null,
    behindBallPct: total > 0 ? Math.round((behindCount / total) * 100) : null,
    behindBallOwnHalfPct:
      behindOwnHalfSamples > 0
        ? Math.round((behindOwnHalfCount / behindOwnHalfSamples) * 100)
        : null,
    sampleCount: total,
  };
}

export function buildTeamPositioning(players) {
  const teams = [0, 1].map((team) => {
    const tp = players.filter((p) => p.team === team);
    const count = tp.length || 1;
    const sumZone = (key) =>
      tp.reduce((acc, p) => acc + (p.zones?.[key] ?? 0), 0);
    const avgZone = (key) => Math.round(sumZone(key) / count);
    const sumPos = (key) =>
      tp.reduce((acc, p) => acc + (p.positioning?.[key] ?? 0), 0);
    const avgPos = (key) => Math.round(sumPos(key) / count);

    return {
      team,
      label: team === 0 ? "Blue" : "Orange",
      playerCount: tp.length,
      defPct: avgZone("defPct"),
      midPct: avgZone("midPct"),
      attPct: avgZone("attPct"),
      avgDistanceToBallUU: Math.round(
        tp.reduce((acc, p) => acc + (p.positioning?.avgDistanceToBallUU ?? 0), 0) / count,
      ),
      behindBallPct: avgPos("behindBallPct"),
      behindBallOwnHalfPct: avgPos("behindBallOwnHalfPct"),
    };
  });

  return teams;
}
