import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT_DIR = process.cwd();
const POSITION_TIMELINE_PATH = path.join(
  ROOT_DIR,
  "output",
  "player-position-timeline.json",
);
const HEATMAP_DIR = path.join(ROOT_DIR, "output", "heatmaps");
const MANIFEST_PATH = path.join(HEATMAP_DIR, "heatmap-manifest.json");

const IMAGE_WIDTH = 1100;
const IMAGE_HEIGHT = 780;
const DENSITY_WIDTH = 320;
const DENSITY_HEIGHT = Math.round((IMAGE_HEIGHT / IMAGE_WIDTH) * DENSITY_WIDTH);

const FIELD_BOUNDS = {
  minX: -4096,
  maxX: 4096,
  minY: -5120,
  maxY: 5120,
};

const FIELD = {
  left: 88,
  right: 1012,
  top: 20,
  bottom: 760,
};

FIELD.width = FIELD.right - FIELD.left;
FIELD.height = FIELD.bottom - FIELD.top;
FIELD.centerX = FIELD.left + FIELD.width / 2;
FIELD.centerY = FIELD.top + FIELD.height / 2;
FIELD.cornerInset = 86;
FIELD.goalDepth = 78;
FIELD.goalHalfHeight = 54;

const HEAT_STOPS = [
  { at: 0, color: [68, 69, 110] },
  { at: 0.34, color: [76, 80, 134] },
  { at: 0.58, color: [68, 122, 92] },
  { at: 0.8, color: [105, 181, 61] },
  { at: 1, color: [158, 222, 51] },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeFileName(value) {
  const safeName = String(value)
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return safeName || "player";
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inBounds(location, bounds = FIELD_BOUNDS) {
  return (
    location.x >= bounds.minX &&
    location.x <= bounds.maxX &&
    location.y >= bounds.minY &&
    location.y <= bounds.maxY
  );
}

function worldToPixel(location, bounds = FIELD_BOUNDS) {
  const horizontalRatio =
    (location.y - bounds.minY) / (bounds.maxY - bounds.minY);
  const verticalRatio =
    (location.x - bounds.minX) / (bounds.maxX - bounds.minX);

  return {
    x: FIELD.left + clamp(horizontalRatio, 0, 1) * FIELD.width,
    y: FIELD.top + (1 - clamp(verticalRatio, 0, 1)) * FIELD.height,
  };
}

function fieldPolygonPoints() {
  const {
    left,
    right,
    top,
    bottom,
    centerY,
    cornerInset,
    goalDepth,
    goalHalfHeight,
  } = FIELD;

  return [
    [left + cornerInset, top],
    [right - cornerInset, top],
    [right, top + cornerInset],
    [right, centerY - goalHalfHeight],
    [right + goalDepth, centerY - goalHalfHeight],
    [right + goalDepth, centerY + goalHalfHeight],
    [right, centerY + goalHalfHeight],
    [right, bottom - cornerInset],
    [right - cornerInset, bottom],
    [left + cornerInset, bottom],
    [left, bottom - cornerInset],
    [left, centerY + goalHalfHeight],
    [left - goalDepth, centerY + goalHalfHeight],
    [left - goalDepth, centerY - goalHalfHeight],
    [left, centerY - goalHalfHeight],
    [left, top + cornerInset],
  ];
}

function pointsToSvg(points) {
  return points.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function pointInPolygon(x, y, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function interpolateColor(low, high, ratio) {
  return [
    Math.round(low[0] + (high[0] - low[0]) * ratio),
    Math.round(low[1] + (high[1] - low[1]) * ratio),
    Math.round(low[2] + (high[2] - low[2]) * ratio),
  ];
}

function heatColor(ratio) {
  const value = clamp(ratio, 0, 1);

  for (let index = 1; index < HEAT_STOPS.length; index++) {
    const previous = HEAT_STOPS[index - 1];
    const next = HEAT_STOPS[index];

    if (value <= next.at) {
      const localRatio = (value - previous.at) / (next.at - previous.at);
      return interpolateColor(previous.color, next.color, localRatio);
    }
  }

  return HEAT_STOPS.at(-1).color;
}

function createBaseSvg(timeline) {
  const polygon = pointsToSvg(fieldPolygonPoints());
  const title = xmlEscape(timeline.replayName ?? "Replay heatmap");

  return Buffer.from(`
    <svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#17181b"/>
      <rect x="7" y="7" width="${IMAGE_WIDTH - 14}" height="${IMAGE_HEIGHT - 14}" fill="#303032"/>
      <polygon points="${polygon}" fill="#242629" opacity="0.9"/>
      <rect x="${FIELD.left}" y="${FIELD.top}" width="${FIELD.width}" height="${FIELD.height}" fill="#222428" opacity="0.32"/>
      <title>${title}</title>
    </svg>
  `);
}

function createFieldLinesSvg() {
  const {
    left,
    right,
    top,
    bottom,
    centerX,
    centerY,
    cornerInset,
    goalDepth,
    goalHalfHeight,
  } = FIELD;

  const blue = "#4f95ff";
  const orange = "#ef7d52";
  const centerLine = "#d8deeb";
  const softLine = "#6d7180";

  const bluePoints = [
    [centerX, top],
    [left + cornerInset, top],
    [left, top + cornerInset],
    [left, centerY - goalHalfHeight],
    [left - goalDepth, centerY - goalHalfHeight],
    [left - goalDepth, centerY + goalHalfHeight],
    [left, centerY + goalHalfHeight],
    [left, bottom - cornerInset],
    [left + cornerInset, bottom],
    [centerX, bottom],
  ];

  const orangePoints = [
    [centerX, top],
    [right - cornerInset, top],
    [right, top + cornerInset],
    [right, centerY - goalHalfHeight],
    [right + goalDepth, centerY - goalHalfHeight],
    [right + goalDepth, centerY + goalHalfHeight],
    [right, centerY + goalHalfHeight],
    [right, bottom - cornerInset],
    [right - cornerInset, bottom],
    [centerX, bottom],
  ];

  return Buffer.from(`
    <svg width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${centerX}" y1="${top}" x2="${centerX}" y2="${bottom}" stroke="${centerLine}" stroke-width="2.2" opacity="0.58"/>
      <line x1="${centerX}" y1="${centerY - 22}" x2="${centerX}" y2="${centerY + 22}" stroke="${centerLine}" stroke-width="3.2" opacity="0.7"/>
      <polyline points="${pointsToSvg(bluePoints)}" fill="none" stroke="${blue}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <polyline points="${pointsToSvg(orangePoints)}" fill="none" stroke="${orange}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <line x1="${centerX}" y1="${top}" x2="${centerX}" y2="${bottom}" stroke="${softLine}" stroke-width="0.7" opacity="0.48"/>
    </svg>
  `);
}

function addDensityPoint(density, x, y, weight = 1) {
  const cellX = clamp(
    Math.round((x / IMAGE_WIDTH) * (DENSITY_WIDTH - 1)),
    0,
    DENSITY_WIDTH - 1,
  );
  const cellY = clamp(
    Math.round((y / IMAGE_HEIGHT) * (DENSITY_HEIGHT - 1)),
    0,
    DENSITY_HEIGHT - 1,
  );

  density[cellY * DENSITY_WIDTH + cellX] += weight;
}

function buildDensity(samples, bounds) {
  const density = new Float32Array(DENSITY_WIDTH * DENSITY_HEIGHT);
  let maxDensity = 0;
  let inBoundsCount = 0;

  for (const sample of samples) {
    if (!inBounds(sample, bounds)) continue;

    inBoundsCount++;
    const point = worldToPixel(sample, bounds);
    addDensityPoint(density, point.x, point.y);
  }

  for (const value of density) {
    if (value > maxDensity) maxDensity = value;
  }

  return {
    density,
    maxDensity,
    inBoundsCount,
  };
}

function densityToRawImage(density, maxDensity) {
  const raw = Buffer.alloc(DENSITY_WIDTH * DENSITY_HEIGHT * 4);

  if (maxDensity <= 0) return raw;

  for (let index = 0; index < density.length; index++) {
    const normalized = Math.pow(density[index] / maxDensity, 0.42);
    const intensity = Math.round(clamp(normalized * 255, 0, 255));
    const offset = index * 4;

    raw[offset] = 255;
    raw[offset + 1] = 255;
    raw[offset + 2] = 255;
    raw[offset + 3] = intensity;
  }

  return raw;
}

async function blurDensity(rawDensity) {
  return sharp(rawDensity, {
    raw: {
      width: DENSITY_WIDTH,
      height: DENSITY_HEIGHT,
      channels: 4,
    },
  })
    .blur(7.5)
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .raw()
    .toBuffer();
}

function colorizeHeatmap(blurredDensity) {
  const overlay = Buffer.alloc(IMAGE_WIDTH * IMAGE_HEIGHT * 4);
  const maskPoints = fieldPolygonPoints();
  let maxAlpha = 0;

  for (let index = 3; index < blurredDensity.length; index += 4) {
    if (blurredDensity[index] > maxAlpha) maxAlpha = blurredDensity[index];
  }

  if (maxAlpha <= 0) return overlay;

  for (let y = 0; y < IMAGE_HEIGHT; y++) {
    for (let x = 0; x < IMAGE_WIDTH; x++) {
      const index = (y * IMAGE_WIDTH + x) * 4;
      const sourceAlpha = blurredDensity[index + 3];

      if (sourceAlpha <= 0 || !pointInPolygon(x, y, maskPoints)) continue;

      const ratio = Math.pow(sourceAlpha / maxAlpha, 0.68);
      if (ratio < 0.035) continue;

      const [red, green, blue] = heatColor(ratio);
      const visualAlpha = Math.round(
        clamp(28 + Math.pow(ratio, 1.12) * 190, 0, 218),
      );

      overlay[index] = red;
      overlay[index + 1] = green;
      overlay[index + 2] = blue;
      overlay[index + 3] = visualAlpha;
    }
  }

  return overlay;
}

async function createHeatOverlay(samples, bounds) {
  const { density, maxDensity, inBoundsCount } = buildDensity(samples, bounds);
  const rawDensity = densityToRawImage(density, maxDensity);
  const blurredDensity = await blurDensity(rawDensity);
  const overlay = colorizeHeatmap(blurredDensity);
  const overlayPng = await sharp(overlay, {
    raw: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  return {
    overlayPng,
    inBoundsCount,
    skippedCount: samples.length - inBoundsCount,
  };
}

async function renderPlayerHeatmap(player, timeline) {
  const bounds = timeline.fieldBounds ?? FIELD_BOUNDS;
  const coverage = await createHeatOverlay(player.samples ?? [], bounds);
  const filename = `${sanitizeFileName(player.playerName || `player_${player.priActorId}`)}.png`;
  const outputPath = path.join(HEATMAP_DIR, filename);

  await sharp(createBaseSvg(timeline))
    .composite([
      {
        input: coverage.overlayPng,
        blend: "over",
      },
      {
        input: createFieldLinesSvg(),
        blend: "over",
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toFile(outputPath);

  return {
    playerName: player.playerName,
    team: player.team,
    priActorId: player.priActorId,
    sampleCount: player.sampleCount,
    inBoundsCount: coverage.inBoundsCount,
    skippedCount: coverage.skippedCount,
    filename,
    path: outputPath,
  };
}

async function main() {
  const timeline = JSON.parse(await fs.readFile(POSITION_TIMELINE_PATH, "utf8"));
  await fs.mkdir(HEATMAP_DIR, { recursive: true });

  const heatmaps = [];

  for (const player of timeline.players ?? []) {
    heatmaps.push(await renderPlayerHeatmap(player, timeline));
  }

  const manifest = {
    replayName: timeline.replayName,
    replayId: timeline.replayId,
    mapName: timeline.mapName,
    image: {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      fieldBounds: timeline.fieldBounds ?? FIELD_BOUNDS,
      orientation: {
        horizontalAxis: "world y",
        verticalAxis: "world x",
        blueGoal: "negative y / left",
        orangeGoal: "positive y / right",
      },
    },
    heatmaps,
  };

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log("\nGenerated player heatmaps:");
  console.table(
    heatmaps.map((heatmap) => ({
      Player: heatmap.playerName,
      Team: heatmap.team,
      Samples: heatmap.sampleCount,
      InBounds: heatmap.inBoundsCount,
      File: heatmap.filename,
    })),
  );

  console.log(`\nSaved heatmap manifest to: ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error("Failed to generate heatmaps:");
  console.error(error);
  process.exit(1);
});
