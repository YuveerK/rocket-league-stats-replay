import { readOutput } from "../repositories/output.repository.js";
import { sumBy, roundBoostValue, median, carDisplayName } from "../utils/format.js";
import {
  BOOST_PAD_VALUES,
  CANONICAL_BOOST_PAD_SNAP_DISTANCE,
  STANDARD_SOCCAR_BOOST_PADS,
  KNOWN_STANDARD_SOCCAR_MAPS,
  KNOWN_NON_STANDARD_MAP_MARKERS,
} from "../config/constants.js";

// ── Pickup event stats (stolen / overfill / by pad type) ─────────────────────

function buildBoostEventStats(events = []) {
  const byPlayer = new Map();

  for (const event of events) {
    if (!event?.playerName) continue;

    if (!byPlayer.has(event.playerName)) {
      byPlayer.set(event.playerName, {
        amountStolen: 0,
        amountCollectedBigPads: 0,
        amountCollectedSmallPads: 0,
        amountStolenBigPads: 0,
        amountStolenSmallPads: 0,
        stolenBigPads: 0,
        stolenSmallPads: 0,
        stolenUnknownPads: 0,
        stolenOtherSidePickups: 0,
        overfillTotal: 0,
        overfillFromStolen: 0,
        knownOverfillEvents: 0,
      });
    }

    const row = byPlayer.get(event.playerName);
    const padValue = BOOST_PAD_VALUES[event.padType] ?? 0;
    const hasGain = typeof event.estimatedBoostGain === "number";
    const boostGain = hasGain ? Math.max(0, event.estimatedBoostGain) : 0;

    if (hasGain && padValue > 0) {
      const overfill = Math.max(0, padValue - Math.min(padValue, event.estimatedBoostGain));
      row.overfillTotal += overfill;
      row.knownOverfillEvents += 1;
      if (event.isStolen) row.overfillFromStolen += overfill;
    }

    if (event.padType === "big") row.amountCollectedBigPads += boostGain;
    if (event.padType === "small") row.amountCollectedSmallPads += boostGain;

    if (!event.isStolen) continue;

    row.stolenOtherSidePickups += 1;
    if (event.padType === "big") row.stolenBigPads += 1;
    else if (event.padType === "small") row.stolenSmallPads += 1;
    else row.stolenUnknownPads += 1;

    if (event.padType === "big") row.amountStolenBigPads += boostGain;
    if (event.padType === "small") row.amountStolenSmallPads += boostGain;
    if (hasGain) row.amountStolen += boostGain;
  }

  for (const row of byPlayer.values()) {
    row.amountStolen = Number(row.amountStolen.toFixed(2));
    row.amountCollectedBigPads = Number(row.amountCollectedBigPads.toFixed(2));
    row.amountCollectedSmallPads = Number(row.amountCollectedSmallPads.toFixed(2));
    row.amountStolenBigPads = Number(row.amountStolenBigPads.toFixed(2));
    row.amountStolenSmallPads = Number(row.amountStolenSmallPads.toFixed(2));
    row.overfillTotal = Number(row.overfillTotal.toFixed(2));
    row.overfillFromStolen = Number(row.overfillFromStolen.toFixed(2));
  }

  return byPlayer;
}

// ── Boost pad summaries + canonical snapping ─────────────────────────────────

function isUsableFieldLocation(location) {
  return (
    location &&
    Number.isFinite(Number(location.x)) &&
    Number.isFinite(Number(location.y)) &&
    !(Number(location.x) === 0 && Number(location.y) === 0)
  );
}

function medianFieldLocation(locations) {
  const usable = locations.filter(isUsableFieldLocation);
  if (!usable.length) return null;
  return {
    x: roundBoostValue(median(usable.map((l) => l.x))),
    y: roundBoostValue(median(usable.map((l) => l.y))),
    z: roundBoostValue(median(usable.map((l) => l.z ?? 0))),
  };
}

function padTypeFromEvents(events) {
  if (events.some((e) => e.padType === "big")) return "big";
  if (events.some((e) => e.padType === "small")) return "small";
  return "unknown";
}

function stableBoostPadId(event) {
  if (event.pickupObjectName) return event.pickupObjectName;
  if (event.padId) return event.padId;

  const location = event.location ?? event.carLocationAtPickup;
  if (isUsableFieldLocation(location)) {
    return `location:${Math.round(Number(location.x) / 256)}:${Math.round(Number(location.y) / 256)}`;
  }

  if (event.pickupActorId !== undefined && event.pickupActorId !== null) {
    return `actor:${event.pickupActorId}`;
  }

  return null;
}

function distance2D(a, b) {
  const dx = Number(a.x) - Number(b.x);
  const dy = Number(a.y) - Number(b.y);
  return Math.sqrt(dx * dx + dy * dy);
}

function nearestCanonicalPad(location, canonicalPads) {
  let best = null;
  for (const pad of canonicalPads) {
    const distance = distance2D(location, pad);
    if (!best || distance < best.distance) best = { pad, distance };
  }
  return best;
}

function normalizeMapName(mapName) {
  return String(mapName ?? "").trim().toLowerCase();
}

function isKnownNonStandardBoostLayout(mapName) {
  const normalized = normalizeMapName(mapName);
  return KNOWN_NON_STANDARD_MAP_MARKERS.some((marker) => normalized.includes(marker));
}

function shouldUseStandardSoccarPads(mapName, rows) {
  if (isKnownNonStandardBoostLayout(mapName)) return false;

  const normalized = normalizeMapName(mapName);
  if (KNOWN_STANDARD_SOCCAR_MAPS.has(normalized)) return true;

  const observedRows = rows.filter((r) => r.location);
  if (observedRows.length < 20) return false;

  const closeRows = observedRows.filter((r) => {
    const nearest = nearestCanonicalPad(r.location, STANDARD_SOCCAR_BOOST_PADS);
    return nearest && nearest.distance <= CANONICAL_BOOST_PAD_SNAP_DISTANCE;
  });

  return closeRows.length / observedRows.length >= 0.75;
}

function snapPadSummariesToCanonical(rows, mapName) {
  if (!shouldUseStandardSoccarPads(mapName, rows)) return rows;

  const candidates = [];
  for (const row of rows) {
    if (!row.location) continue;
    const nearest = nearestCanonicalPad(row.location, STANDARD_SOCCAR_BOOST_PADS);
    if (nearest && nearest.distance <= CANONICAL_BOOST_PAD_SNAP_DISTANCE) {
      candidates.push({ rowId: row.id, ...nearest });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);

  const assignmentByRowId = new Map();
  const usedCanonicalIndexes = new Set();

  for (const candidate of candidates) {
    if (assignmentByRowId.has(candidate.rowId)) continue;
    if (usedCanonicalIndexes.has(candidate.pad.index)) continue;
    assignmentByRowId.set(candidate.rowId, candidate);
    usedCanonicalIndexes.add(candidate.pad.index);
  }

  const snapped = rows.map((row) => {
    const assignment = assignmentByRowId.get(row.id);
    if (!assignment) return row;
    const pad = assignment.pad;
    return {
      ...row,
      x: pad.x, y: pad.y, z: pad.z,
      location: { x: pad.x, y: pad.y, z: pad.z },
      estimatedLocation: row.location,
      padType: pad.padType,
      canonicalPadId: pad.id,
      canonicalIndex: pad.index,
      canonicalSnapDistance: roundBoostValue(assignment.distance),
      locationSource: "canonical-standard-soccar",
    };
  });

  for (const pad of STANDARD_SOCCAR_BOOST_PADS) {
    if (usedCanonicalIndexes.has(pad.index)) continue;
    snapped.push({
      id: `canonical:${pad.id}`,
      pickupObjectName: null,
      pickupActorIds: [],
      x: pad.x, y: pad.y, z: pad.z,
      location: { x: pad.x, y: pad.y, z: pad.z },
      estimatedLocation: null,
      padType: pad.padType,
      count: 0, stolenCount: 0, amountCollected: 0,
      pickupsByPlayer: {}, stolenByPlayer: {},
      canonicalPadId: pad.id,
      canonicalIndex: pad.index,
      canonicalSnapDistance: null,
      locationSource: "canonical-standard-soccar-unobserved",
    });
  }

  return snapped;
}

export function buildBoostPadSummaries(events = [], mapName = null) {
  const byPad = new Map();

  for (const event of events) {
    const padId = stableBoostPadId(event);
    if (!padId) continue;

    if (!byPad.has(padId)) {
      byPad.set(padId, {
        id: padId,
        pickupObjectName: event.pickupObjectName ?? null,
        pickupActorIds: new Set(),
        events: [],
        locations: [],
        pickupsByPlayer: {},
        stolenByPlayer: {},
        count: 0,
        stolenCount: 0,
        amountCollected: 0,
      });
    }

    const row = byPad.get(padId);
    row.events.push(event);
    row.count += 1;

    if (event.pickupActorId !== undefined && event.pickupActorId !== null) {
      row.pickupActorIds.add(event.pickupActorId);
    }

    const location = event.padLocation ?? event.location ?? event.carLocationAtPickup;
    if (isUsableFieldLocation(location)) row.locations.push(location);

    if (event.playerName) {
      row.pickupsByPlayer[event.playerName] = (row.pickupsByPlayer[event.playerName] ?? 0) + 1;
      if (event.isStolen) {
        row.stolenByPlayer[event.playerName] = (row.stolenByPlayer[event.playerName] ?? 0) + 1;
      }
    }

    if (event.isStolen) row.stolenCount += 1;
    if (typeof event.estimatedBoostGain === "number") row.amountCollected += event.estimatedBoostGain;
  }

  const rows = [...byPad.values()]
    .map((row) => {
      const location = medianFieldLocation(row.locations);
      if (!location) return null;
      return {
        id: row.id,
        pickupObjectName: row.pickupObjectName,
        pickupActorIds: [...row.pickupActorIds],
        x: location.x, y: location.y, z: location.z,
        location,
        padType: padTypeFromEvents(row.events),
        count: row.count,
        stolenCount: row.stolenCount,
        amountCollected: roundBoostValue(row.amountCollected),
        pickupsByPlayer: row.pickupsByPlayer,
        stolenByPlayer: row.stolenByPlayer,
        locationSource: "median-pickup-contact",
      };
    })
    .filter(Boolean);

  return snapPadSummariesToCanonical(rows, mapName)
    .sort((a, b) => b.y - a.y || a.x - b.x);
}

// ── Public service methods ────────────────────────────────────────────────────

export async function getBoostTeamData() {
  const [boostStats, pickupStats, finalStats, matchMeta] = await Promise.all([
    readOutput("boost-stats-v2.json"),
    readOutput("boost-pickup-stats-v2.json"),
    readOutput("final-player-stats.json"),
    readOutput("match-meta.json"),
  ]);

  if (!boostStats && !finalStats) return null;

  const pickupByPlayer = new Map((pickupStats?.players ?? []).map((p) => [p.playerName, p]));
  const finalByPlayer = new Map((finalStats?.players ?? []).map((p) => [p.playerName, p]));
  const eventStatsByPlayer = buildBoostEventStats(pickupStats?.events ?? []);

  const players = (boostStats?.players ?? finalStats?.players ?? []).map((player) => {
    const pickup = pickupByPlayer.get(player.playerName) ?? {};
    const final = finalByPlayer.get(player.playerName) ?? {};
    const eventStats = eventStatsByPlayer.get(player.playerName) ?? {};

    return {
      playerName: player.playerName,
      team: player.team ?? final.team ?? pickup.team ?? null,
      bpm: roundBoostValue(player.bpm ?? final.bpm),
      averageBoost: roundBoostValue(player.averageBoost ?? final.averageBoost),
      boostUsed: roundBoostValue(player.boostUsed ?? final.boostUsed),
      boostCollectedApprox: roundBoostValue(player.boostCollectedApprox ?? final.boostCollectedApprox),
      zeroBoostSeconds: roundBoostValue(player.zeroBoostSeconds ?? final.zeroBoostSeconds),
      fullBoostSeconds: roundBoostValue(player.fullBoostSeconds ?? final.fullBoostSeconds),
      sampleCount: player.sampleCount ?? 0,
      pickups: pickup.pickups ?? final.pickups ?? 0,
      bigPads: pickup.bigPads ?? final.bigPads ?? 0,
      smallPads: pickup.smallPads ?? final.smallPads ?? 0,
      unknownPads: pickup.unknownPads ?? final.unknownPads ?? 0,
      boostStolenCount: pickup.boostStolen ?? final.boostStolen ?? 0,
      amountStolen: roundBoostValue(eventStats.amountStolen),
      amountCollectedBigPads: roundBoostValue(eventStats.amountCollectedBigPads),
      amountStolenBigPads: roundBoostValue(eventStats.amountStolenBigPads),
      amountCollectedSmallPads: roundBoostValue(eventStats.amountCollectedSmallPads),
      amountStolenSmallPads: roundBoostValue(eventStats.amountStolenSmallPads),
      stolenBigPads: eventStats.stolenBigPads ?? 0,
      stolenSmallPads: eventStats.stolenSmallPads ?? 0,
      stolenUnknownPads: eventStats.stolenUnknownPads ?? 0,
      stolenOtherSidePickups: eventStats.stolenOtherSidePickups ?? 0,
      overfillTotal: roundBoostValue(eventStats.overfillTotal),
      overfillFromStolen: roundBoostValue(eventStats.overfillFromStolen),
      knownOverfillEvents: eventStats.knownOverfillEvents ?? 0,
      boost0To25Pct: roundBoostValue(player.boost0To25Pct, 1),
      boost25To50Pct: roundBoostValue(player.boost25To50Pct, 1),
      boost50To75Pct: roundBoostValue(player.boost50To75Pct, 1),
      boost75To100Pct: roundBoostValue(player.boost75To100Pct, 1),
      boost0To25Seconds: roundBoostValue(player.boost0To25Seconds),
      boost25To50Seconds: roundBoostValue(player.boost25To50Seconds),
      boost50To75Seconds: roundBoostValue(player.boost50To75Seconds),
      boost75To100Seconds: roundBoostValue(player.boost75To100Seconds),
      boostUsedWhileSupersonic: roundBoostValue(player.boostUsedWhileSupersonic),
    };
  });

  const teams = [0, 1].map((team) => {
    const teamPlayers = players.filter((p) => p.team === team);
    const playerCount = teamPlayers.length || 1;
    const averageBoostTotal = sumBy(teamPlayers, (p) => p.averageBoost);
    const amountCollected = sumBy(teamPlayers, (p) => p.boostCollectedApprox);
    const amountStolen = sumBy(teamPlayers, (p) => p.amountStolen);

    return {
      team,
      label: team === 0 ? "Blue" : "Orange",
      playerCount: teamPlayers.length,
      bpm: roundBoostValue(sumBy(teamPlayers, (p) => p.bpm)),
      averageBoostTotal: roundBoostValue(averageBoostTotal),
      averageBoostPerPlayer: roundBoostValue(averageBoostTotal / playerCount),
      boostUsed: roundBoostValue(sumBy(teamPlayers, (p) => p.boostUsed)),
      amountCollected: roundBoostValue(amountCollected),
      amountStolen: roundBoostValue(amountStolen),
      boostStealPct: amountCollected > 0 ? roundBoostValue((amountStolen / amountCollected) * 100, 1) : 0,
      zeroBoostSeconds: roundBoostValue(sumBy(teamPlayers, (p) => p.zeroBoostSeconds)),
      fullBoostSeconds: roundBoostValue(sumBy(teamPlayers, (p) => p.fullBoostSeconds)),
      pickups: sumBy(teamPlayers, (p) => p.pickups),
      bigPads: sumBy(teamPlayers, (p) => p.bigPads),
      smallPads: sumBy(teamPlayers, (p) => p.smallPads),
      unknownPads: sumBy(teamPlayers, (p) => p.unknownPads),
      boostStolenCount: sumBy(teamPlayers, (p) => p.boostStolenCount),
      stolenBigPads: sumBy(teamPlayers, (p) => p.stolenBigPads),
      stolenSmallPads: sumBy(teamPlayers, (p) => p.stolenSmallPads),
      stolenUnknownPads: sumBy(teamPlayers, (p) => p.stolenUnknownPads),
      overfillTotal: roundBoostValue(sumBy(teamPlayers, (p) => p.overfillTotal)),
      overfillFromStolen: roundBoostValue(sumBy(teamPlayers, (p) => p.overfillFromStolen)),
      knownOverfillEvents: sumBy(teamPlayers, (p) => p.knownOverfillEvents),
    };
  });

  const matchDuration =
    finalStats?.totalSecondsPlayed ?? matchMeta?.totalSecondsPlayed ?? boostStats?.matchDurationSeconds ?? null;

  return {
    replayName: finalStats?.replayName ?? boostStats?.replayName ?? pickupStats?.replayName ?? null,
    replayId: finalStats?.replayId ?? boostStats?.replayId ?? pickupStats?.replayId ?? null,
    mapName: finalStats?.mapName ?? boostStats?.mapName ?? pickupStats?.mapName ?? null,
    matchDuration,
    notes: [
      "BPM is summed from player boost consumption per minute.",
      "Average boost total is the sum of each player's average boost, matching team-level replay tables.",
      "Boost stolen and overfill are estimated from parsed pickup events and nearby boost meter gain.",
    ],
    teams,
    players,
  };
}

export async function getBoostPlayersData() {
  const [boostStats, pickupStats, finalStats, matchMeta, playerMapping, advancedStats] =
    await Promise.all([
      readOutput("boost-stats-v2.json"),
      readOutput("boost-pickup-stats-v2.json"),
      readOutput("final-player-stats.json"),
      readOutput("match-meta.json"),
      readOutput("player-mapping.json"),
      readOutput("advanced-player-stats.json"),
    ]);

  if (!boostStats && !finalStats) return null;

  const pickupByPlayer = new Map((pickupStats?.players ?? []).map((p) => [p.playerName, p]));
  const finalByPlayer = new Map((finalStats?.players ?? []).map((p) => [p.playerName, p]));
  const platformByName = new Map((playerMapping?.players ?? []).map((p) => [p.playerName, p.platform]));
  const advancedByName = new Map((advancedStats?.players ?? []).map((p) => [p.playerName, p]));
  const eventStatsByPlayer = buildBoostEventStats(pickupStats?.events ?? []);

  const players = (boostStats?.players ?? finalStats?.players ?? []).map((player) => {
    const pickup = pickupByPlayer.get(player.playerName) ?? {};
    const final = finalByPlayer.get(player.playerName) ?? {};
    const advanced = advancedByName.get(player.playerName) ?? {};
    const eventStats = eventStatsByPlayer.get(player.playerName) ?? {};
    const amountCollected = roundBoostValue(player.boostCollectedApprox ?? final.boostCollectedApprox);
    const amountStolen = roundBoostValue(eventStats.amountStolen);

    return {
      playerName: player.playerName,
      team: player.team ?? final.team ?? pickup.team ?? null,
      platform: platformByName.get(player.playerName) ?? null,
      car: carDisplayName(advanced?.loadout?.body),
      score: player.score ?? final.score ?? 0,
      bpm: roundBoostValue(player.bpm ?? final.bpm),
      averageBoost: roundBoostValue(player.averageBoost ?? final.averageBoost),
      boostUsed: roundBoostValue(player.boostUsed ?? final.boostUsed),
      boostCollectedApprox: amountCollected,
      amountCollected,
      zeroBoostSeconds: roundBoostValue(player.zeroBoostSeconds ?? final.zeroBoostSeconds),
      fullBoostSeconds: roundBoostValue(player.fullBoostSeconds ?? final.fullBoostSeconds),
      boost0To25Pct: roundBoostValue(player.boost0To25Pct, 1),
      boost25To50Pct: roundBoostValue(player.boost25To50Pct, 1),
      boost50To75Pct: roundBoostValue(player.boost50To75Pct, 1),
      boost75To100Pct: roundBoostValue(player.boost75To100Pct, 1),
      boost0To25Seconds: roundBoostValue(player.boost0To25Seconds),
      boost25To50Seconds: roundBoostValue(player.boost25To50Seconds),
      boost50To75Seconds: roundBoostValue(player.boost50To75Seconds),
      boost75To100Seconds: roundBoostValue(player.boost75To100Seconds),
      boostUsedWhileSupersonic: roundBoostValue(player.boostUsedWhileSupersonic),
      pickups: pickup.pickups ?? final.pickups ?? 0,
      bigPads: pickup.bigPads ?? final.bigPads ?? 0,
      stolenBigPads: eventStats.stolenBigPads ?? 0,
      smallPads: pickup.smallPads ?? final.smallPads ?? 0,
      stolenSmallPads: eventStats.stolenSmallPads ?? 0,
      stolenOtherSidePickups: eventStats.stolenOtherSidePickups ?? 0,
      amountStolen,
      amountCollectedBigPads: roundBoostValue(eventStats.amountCollectedBigPads),
      amountStolenBigPads: roundBoostValue(eventStats.amountStolenBigPads),
      amountCollectedSmallPads: roundBoostValue(eventStats.amountCollectedSmallPads),
      amountStolenSmallPads: roundBoostValue(eventStats.amountStolenSmallPads),
      overfillTotal: roundBoostValue(eventStats.overfillTotal),
      overfillFromStolen: roundBoostValue(eventStats.overfillFromStolen),
      knownOverfillEvents: eventStats.knownOverfillEvents ?? 0,
    };
  });

  const matchDuration =
    finalStats?.totalSecondsPlayed ?? matchMeta?.totalSecondsPlayed ?? boostStats?.matchDurationSeconds ?? null;

  return {
    replayName: finalStats?.replayName ?? boostStats?.replayName ?? pickupStats?.replayName ?? null,
    replayId: finalStats?.replayId ?? boostStats?.replayId ?? pickupStats?.replayId ?? null,
    mapName: finalStats?.mapName ?? boostStats?.mapName ?? pickupStats?.mapName ?? null,
    matchDuration,
    notes: [
      "Boost ranges are time-weighted from each player's replicated boost meter samples.",
      "Amount used while supersonic is boost meter decrease while the latest car speed sample is at least 2200 UU/s.",
      "Stolen pickups are pads taken on the other team's side; midfield pickups are excluded.",
      "Overfill is estimated pad value minus visible boost gain. Example: at 80 boost, a big pad overfills by 80.",
    ],
    players,
  };
}

export async function getBoostPickupsData() {
  const [pickupStats, finalStats, matchMeta] = await Promise.all([
    readOutput("boost-pickup-stats-v2.json"),
    readOutput("final-player-stats.json"),
    readOutput("match-meta.json"),
  ]);

  if (!pickupStats) return null;

  const mapName = pickupStats.mapName ?? finalStats?.mapName ?? null;
  const pads = buildBoostPadSummaries(pickupStats.events ?? [], mapName);
  const canonicalPadCount = pads.filter((p) =>
    String(p.locationSource ?? "").startsWith("canonical"),
  ).length;

  return {
    replayName: pickupStats.replayName ?? finalStats?.replayName ?? null,
    mapName,
    matchDuration: finalStats?.totalSecondsPlayed ?? matchMeta?.totalSecondsPlayed ?? null,
    players: pickupStats.players ?? [],
    events: pickupStats.events ?? [],
    pads,
    padLocationMode: canonicalPadCount > 0 ? "canonical-standard-soccar" : "estimated-median-contact",
    fieldBounds: { minX: -4096, maxX: 4096, minY: -5120, maxY: 5120 },
  };
}
