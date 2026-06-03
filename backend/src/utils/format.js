import { CAR_NAMES } from "../config/constants.js";

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function cleanPlatform(platform) {
  const value = platform?.value ?? platform;
  if (typeof value !== "string") return null;
  return value.replace(/^OnlinePlatform_/, "");
}

export function cleanMapName(mapName) {
  if (!mapName) return null;
  return String(mapName).replace(/_P$/i, "").replace(/_/g, " ").trim();
}

export function pct(value, total) {
  return total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;
}

export function sumBy(items, getValue) {
  return items.reduce((sum, item) => sum + (Number(getValue(item)) || 0), 0);
}

export function median(values) {
  const sorted = values
    .map((v) => Number(v))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!sorted.length) return 0;

  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function watchNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function watchRound(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(decimals));
}

export function roundBoostValue(value, decimals = 2) {
  return Number((Number(value) || 0).toFixed(decimals));
}

export function carDisplayName(bodyId) {
  if (!bodyId && bodyId !== 0) return "Unknown";
  return CAR_NAMES[bodyId] ?? `Car #${bodyId}`;
}
