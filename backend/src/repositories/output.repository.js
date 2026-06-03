import fs from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR } from "../config/paths.js";

export async function readOutput(filename) {
  try {
    return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, filename), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeOutput(filename, data) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUTPUT_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}
