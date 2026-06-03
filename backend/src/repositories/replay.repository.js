import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  BACKEND_DIR,
  RRROCKET_PATH,
  REPLAY_LIBRARY_DIR,
} from "../config/paths.js";

export { REPLAY_LIBRARY_DIR };

export async function getReplayFiles() {
  let entries;
  try {
    entries = await fs.readdir(REPLAY_LIBRARY_DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".replay")) continue;

    const replayPath = path.join(REPLAY_LIBRARY_DIR, entry.name);
    const stats = await fs.stat(replayPath);
    files.push({
      fileName: entry.name,
      replayPath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      mtimeMs: stats.mtimeMs,
    });
  }
  return files;
}

export function parseReplayHeader(replayPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(RRROCKET_PATH, [replayPath], {
      cwd: BACKEND_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `rrrocket.exe exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });
}
