import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) return null;

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex === -1) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

export function loadEnv(envPath = path.join(ROOT_DIR, ".env")) {
  if (!fs.existsSync(envPath)) return {};

  const parsed = {};
  const raw = fs.readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const pair = parseEnvLine(line);
    if (!pair) continue;

    const [key, value] = pair;
    parsed[key] = value;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return parsed;
}

export function getConfigValue(key, fallback = null) {
  return process.env[key] ?? fallback;
}

export function getBooleanConfig(key, fallback = false) {
  const value = process.env[key];

  if (value === undefined) return fallback;

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getNumberConfig(key, fallback) {
  const value = Number(process.env[key]);

  return Number.isFinite(value) ? value : fallback;
}
