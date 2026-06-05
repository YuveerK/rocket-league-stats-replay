import { readReplayArtifacts } from "../repositories/artifact.repository.js";
import {
  buildTeamPositioning,
  computePlayerZones,
  computePositioningMetrics,
  FIELD_BOUNDS,
} from "../utils/positioning.js";

export async function getPositioningData({ replayId = null } = {}) {
  const [positions, ballTimeline, finalStats, matchMeta, playerMapping] = await readReplayArtifacts(
    [
      "player-position-timeline.json",
      "ball-position-timeline.json",
      "final-player-stats.json",
      "match-meta.json",
      "player-mapping.json",
    ],
    { replayId },
  );

  if (!positions) return null;

  const ballSamples = ballTimeline?.samples ?? [];
  const platformByName = new Map(
    (playerMapping?.players ?? []).map((p) => [p.playerName, p.platform]),
  );

  const players = positions.players.map((p) => {
    const zones = computePlayerZones(p);
    const positioning = computePositioningMetrics(p, ballSamples);

    return {
      playerName: p.playerName,
      team: p.team,
      platform: platformByName.get(p.playerName) ?? null,
      sampleCount: p.sampleCount ?? p.samples?.length ?? 0,
      zones,
      positioning,
    };
  });

  const matchDuration =
    finalStats?.totalSecondsPlayed ??
    matchMeta?.totalSecondsPlayed ??
    (ballSamples.length
      ? ballSamples[ballSamples.length - 1]?.elapsedSeconds
      : null);

  return {
    replayName: finalStats?.replayName ?? positions.replayName ?? null,
    mapName: finalStats?.mapName ?? matchMeta?.mapName ?? null,
    matchDuration,
    fieldBounds: positions.fieldBounds ?? FIELD_BOUNDS,
    teams: buildTeamPositioning(players),
    players,
    notes: [
      "Field thirds are team-relative: defensive / midfield / attacking.",
      "Distance to ball uses nearest ball sample at or before each car sample time.",
      "Behind ball % counts samples where the car is closer to its own goal than the ball.",
      "Behind ball on own half only counts samples in the car's defensive half of the field.",
    ],
  };
}
