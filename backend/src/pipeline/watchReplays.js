import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  getBooleanConfig,
  getConfigValue,
  getNumberConfig,
  loadEnv,
  ROOT_DIR,
} from "../utils/config.js";

const DEFAULT_REPLAY_DIR = path.join(ROOT_DIR, "replays");
const PROCESSED_FILE = path.join(ROOT_DIR, "output", "processed-replays.json");

function resolvePath(value, fallback) {
  if (!value) return fallback;
  return path.resolve(ROOT_DIR, value);
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT_DIR, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

async function loadProcessed() {
  try {
    const data = JSON.parse(await fsp.readFile(PROCESSED_FILE, "utf8"));
    if (Array.isArray(data)) return new Set(data);
    // Migrate old format: object keyed by full path → extract basenames
    if (data && typeof data === "object") {
      return new Set(Object.keys(data).map((p) => path.basename(p)));
    }
    return new Set();
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return new Set();
    throw error;
  }
}

async function saveProcessed(processed) {
  await fsp.mkdir(path.dirname(PROCESSED_FILE), { recursive: true });
  await fsp.writeFile(PROCESSED_FILE, JSON.stringify([...processed], null, 2));
}

async function listReplayFilenames(replayDir) {
  try {
    const entries = await fsp.readdir(replayDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".replay"))
      .map((e) => e.name);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fsp.mkdir(replayDir, { recursive: true });
      return [];
    }
    throw error;
  }
}

async function analyzeAndPost(replayPath, dryRun) {
  console.log(`\nProcessing replay: ${path.basename(replayPath)}`);
  await runProcess(process.execPath, [path.join(ROOT_DIR, "src", "pipeline", "analyzeReplay.js"), replayPath]);
  const postArgs = [path.join(ROOT_DIR, "src", "pipeline", "postToDiscord.js")];
  if (dryRun) postArgs.push("--dry-run");
  await runProcess(process.execPath, postArgs);
}

async function main() {
  loadEnv();

  const replayDir = resolvePath(getConfigValue("REPLAY_WATCH_DIR"), DEFAULT_REPLAY_DIR);
  const pollIntervalMs = getNumberConfig("REPLAY_POLL_INTERVAL_MS", 2000);
  const dryRun = getBooleanConfig("DISCORD_DRY_RUN", false);

  const processed = await loadProcessed();

  // Sync processed set with the current folder contents:
  // - remove entries for files that no longer exist on disk
  // - add entries for existing files not yet tracked (so they are skipped)
  const existingFilenames = await listReplayFilenames(replayDir);
  const existingSet = new Set(existingFilenames);
  let changed = false;

  for (const filename of processed) {
    if (!existingSet.has(filename)) {
      processed.delete(filename);
      changed = true;
    }
  }

  for (const filename of existingFilenames) {
    if (!processed.has(filename)) {
      processed.add(filename);
      changed = true;
    }
  }

  if (changed) await saveProcessed(processed);

  let busy = false;

  async function scan() {
    if (busy) return;
    busy = true;
    try {
      const filenames = await listReplayFilenames(replayDir);
      for (const filename of filenames) {
        if (processed.has(filename)) continue;
        await analyzeAndPost(path.join(replayDir, filename), dryRun);
        processed.add(filename);
        await saveProcessed(processed);
      }
    } catch (error) {
      console.error("Replay processing failed:", error.message);
    } finally {
      busy = false;
    }
  }

  console.log("Watching replay folder:", replayDir);
  console.log(`Poll interval: ${pollIntervalMs}ms`);
  console.log(dryRun ? "Discord posting is in dry-run mode." : "Discord posting is enabled.");

  setInterval(() => {
    scan().catch((error) => console.error("Scan error:", error.message));
  }, pollIntervalMs);
}

main().catch((error) => {
  console.error("Watcher failed:", error.message);
  process.exit(1);
});
