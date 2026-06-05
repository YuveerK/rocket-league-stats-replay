import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..", "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const RRROCKET_PATH = path.join(ROOT_DIR, "tools", "rrrocket.exe");
const NETWORK_JSON_PATH = path.join(OUTPUT_DIR, "replay-network.json");
const FINAL_STATS_PATH = path.join(OUTPUT_DIR, "final-player-stats.json");

const ANALYSIS_STEPS = [
  "src/pipeline/buildPlayerMapping.js",
  "src/pipeline/extractPlayerPositions.js",
  "src/pipeline/extractBoostStatsV2.js",
  "src/pipeline/extractBoostPickupStats.js",
  "src/pipeline/refineBoostPickupStatsV2.js",
  "src/pipeline/extractGameTimeline.js",
  "src/pipeline/extractBallStats.js",
  "src/pipeline/extractAdvancedPlayerStats.js",
  "src/pipeline/extractMatchMeta.js",
  "src/pipeline/combinePlayerStats.js",
  "src/pipeline/renderDiscordCards.js",
  "src/pipeline/persistToDb.js",
];

function printUsage() {
  console.error("Usage:");
  console.error('  node .\\src\\pipeline\\analyzeReplay.js ".\\replays\\file.replay"');
}

function resolveReplayPath(replayArg) {
  const directPath = path.resolve(process.cwd(), replayArg);

  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const replayFolderPath = path.join(ROOT_DIR, "replays", replayArg);

  if (fs.existsSync(replayFolderPath)) {
    return replayFolderPath;
  }

  return directPath;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: options.stdio ?? "inherit",
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

async function parseNetworkJson(replayPath) {
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(NETWORK_JSON_PATH);
    const child = spawn(
      RRROCKET_PATH,
      ["--network-parse", "--pretty", replayPath],
      {
        cwd: ROOT_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout.pipe(output);
    child.stderr.pipe(process.stderr);

    child.on("error", reject);
    output.on("error", reject);

    child.on("close", (code) => {
      output.end();

      if (code !== 0) {
        reject(new Error(`rrrocket.exe exited with code ${code}`));
      }
    });

    output.on("finish", resolve);
  });
}

async function runAnalysisStep(scriptPath) {
  const absoluteScriptPath = path.join(ROOT_DIR, scriptPath);
  await runProcess(process.execPath, [absoluteScriptPath]);
}

async function main() {
  const replayArg = process.argv[2];

  if (!replayArg) {
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(RRROCKET_PATH)) {
    throw new Error(`rrrocket.exe not found at ${RRROCKET_PATH}`);
  }

  const replayPath = resolveReplayPath(replayArg);

  if (!fs.existsSync(replayPath)) {
    throw new Error(`Replay file not found: ${replayPath}`);
  }

  console.log("Analyzing replay:");
  console.log(replayPath);

  await fsp.writeFile(
    path.join(OUTPUT_DIR, "current-replay.json"),
    JSON.stringify({ replayPath, fileName: path.basename(replayPath) }),
    "utf8",
  );

  const totalSteps = ANALYSIS_STEPS.length + 1;

  console.log(`\n1/${totalSteps} Converting replay network data...`);
  await parseNetworkJson(replayPath);
  console.log(`Saved network JSON to: ${NETWORK_JSON_PATH}`);

  for (let index = 0; index < ANALYSIS_STEPS.length; index++) {
    const step = ANALYSIS_STEPS[index];
    console.log(`\n${index + 2}/${totalSteps} Running ${step}...`);
    await runAnalysisStep(step);
  }

  console.log("\nAnalysis complete.");
  console.log(`Final stats: ${FINAL_STATS_PATH}`);
}

main().catch((error) => {
  console.error("\nFailed to analyze replay:");
  console.error(error.message);
  process.exit(1);
});
