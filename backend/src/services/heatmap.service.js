import { readReplayArtifacts } from "../repositories/artifact.repository.js";

const ZONE_DEF_THIRD = -5120 + 10240 / 3; // ≈ -1707
const ZONE_ATT_THIRD = 5120 - 10240 / 3;  // ≈  1707
const AERIAL_Z = 100;

function computePlayerZones(player) {
  const samples = player.samples ?? [];
  const total = samples.length || 1;
  let defTime = 0, midTime = 0, attTime = 0, aerialTime = 0;

  for (const s of samples) {
    // Flip Y for team 1 so "defence" always means their own half
    const y = player.team === 1 ? -s.y : s.y;
    if (y < ZONE_DEF_THIRD)      defTime++;
    else if (y < ZONE_ATT_THIRD) midTime++;
    else                          attTime++;
    if ((s.z ?? 0) > AERIAL_Z) aerialTime++;
  }

  return {
    defPct:    Math.round((defTime    / total) * 100),
    midPct:    Math.round((midTime    / total) * 100),
    attPct:    Math.round((attTime    / total) * 100),
    aerialPct: Math.round((aerialTime / total) * 100),
    groundPct: Math.round(((total - aerialTime) / total) * 100),
  };
}

export async function getHeatmapData({ replayId = null } = {}) {
  const [positions, manifest, mapping] = await readReplayArtifacts(
    ["player-position-timeline.json", "heatmaps/heatmap-manifest.json", "player-mapping.json"],
    { replayId },
  );

  if (!positions) return null;

  const platformByName = new Map(
    (mapping?.players ?? []).map((p) => [p.playerName, p.platform]),
  );
  const heatmapByName = new Map(
    (manifest?.heatmaps ?? []).map((h) => [h.playerName, h.filename]),
  );

  const players = positions.players.map((p) => {
    const samples = p.samples ?? [];
    return {
      playerName: p.playerName,
      team: p.team,
      platform: platformByName.get(p.playerName) ?? null,
      sampleCount: p.sampleCount,
      heatmapImage: heatmapByName.get(p.playerName) ?? null,
      // [x, y, z, csecs] — csecs = elapsedSeconds * 100 as integer
      samples: samples.map((s) => [
        Math.round(s.x),
        Math.round(s.y),
        Math.round(s.z ?? 0),
        Math.round((s.elapsedSeconds ?? 0) * 100),
      ]),
      zones: computePlayerZones(p),
    };
  });

  const maxCsecs = Math.max(0, ...players.flatMap((p) => p.samples.map((s) => s[3])));

  return {
    players,
    fieldBounds: positions.fieldBounds,
    matchDuration: maxCsecs / 100,
  };
}
