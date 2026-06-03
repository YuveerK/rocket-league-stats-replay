import path from "node:path";
import { spawn } from "node:child_process";
import { BACKEND_DIR } from "../config/paths.js";
import { STEP_LABEL_MAP } from "../config/constants.js";

export function formatStepLabel(raw) {
  if (raw.toLowerCase().startsWith("converting")) return "Converting replay data";
  const m = raw.match(/Running src\/(\w+)\.js/);
  if (m) return STEP_LABEL_MAP[m[1]] ?? m[1];
  return raw.replace(/^Running\s+/, "");
}

export function spawnAnalysis(replayPath) {
  return spawn(
    process.execPath,
    [path.join(BACKEND_DIR, "src", "pipeline", "analyzeReplay.js"), replayPath],
    { cwd: BACKEND_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
}
