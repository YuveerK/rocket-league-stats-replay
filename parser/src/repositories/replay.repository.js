import { spawn } from "node:child_process";
import { RRROCKET_PATH } from "../config/paths.js";

export function parseReplayHeader(replayPath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(RRROCKET_PATH, [replayPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", () => {});

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`rrrocket exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(new Error(`Failed to parse replay header JSON: ${err.message}`));
      }
    });
  });
}
