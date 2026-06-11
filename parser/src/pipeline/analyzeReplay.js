import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseReplayFile, parseReplayHeaderOnly } from "../lib/replay-parser/index.js";
import { ROOT_DIR } from "../utils/config.js";
import { buildPlayerMapping } from "./buildPlayerMapping.js";
import { extractPlayerPositions } from "./extractPlayerPositions.js";
import { extractBoostStatsV2 } from "./extractBoostStatsV2.js";
import { extractBoostPickups } from "./extractBoostPickupStats.js";
import { extractGameTimeline } from "./extractGameTimeline.js";
import { extractBallStats } from "./extractBallStats.js";
import { extractAdvancedPlayerStats } from "./extractAdvancedPlayerStats.js";
import { extractMatchMeta } from "./extractMatchMeta.js";
import { combinePlayerStats } from "./combinePlayerStats.js";
import { renderDiscordCards } from "./renderDiscordCards.js";
import { persistToDb } from "./persistToDb.js";
import { postToDiscord } from "./postToDiscord.js";

const RRROCKET_PATH = path.join(ROOT_DIR, "tools", "rrrocket.exe");
const FINAL_STATS_PATH = path.join(ROOT_DIR, "output", "final-player-stats.json");

function resolveReplayPath(replayArg) {
  const directPath = path.resolve(process.cwd(), replayArg);
  if (fs.existsSync(directPath)) return directPath;

  const replayFolderPath = path.join(ROOT_DIR, "replays", replayArg);
  if (fs.existsSync(replayFolderPath)) return replayFolderPath;

  return directPath;
}

async function parseWithRrrocketInMemory(replayPath) {
  const chunks = [];

  await new Promise((resolve, reject) => {
    const child = spawn(RRROCKET_PATH, ["--network-parse", "--pretty", replayPath], {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.pipe(process.stderr);
    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`rrrocket.exe exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function runPipeline(replayPath, { skipDiscord = false, silent = false } = {}) {
  const log = silent ? () => {} : console.log;
  const warn = silent ? () => {} : console.warn;
  const totalSteps = skipDiscord ? 12 : 13;
  const fileName = path.basename(replayPath);
  const rrrocketAvailable = fs.existsSync(RRROCKET_PATH);

  log("Analyzing replay:");
  log(replayPath);

  // Step 1 — parse replay into memory
  log(`\n1/${totalSteps} Parsing replay...`);
  let replay;
  try {
    replay = await parseReplayFile(replayPath);
  } catch (nodeParserErr) {
    warn(`  Warning: Node.js parser failed — ${nodeParserErr.message}`);
    if (rrrocketAvailable) {
      warn("  Trying rrrocket.exe fallback...");
      try {
        replay = await parseWithRrrocketInMemory(replayPath);
        warn("  rrrocket.exe succeeded.");
      } catch (rrrocketErr) {
        warn(`  Warning: rrrocket.exe also failed — ${rrrocketErr.message}`);
        warn("  Falling back to header-only mode (boost/position stats will be unavailable).");
        replay = await parseReplayHeaderOnly(replayPath);
      }
    } else {
      warn("  Falling back to header-only mode (boost/position stats will be unavailable).");
      replay = await parseReplayHeaderOnly(replayPath);
    }
  }

  const ctx = { replayPath, fileName, replay };

  // Step 2 — player mapping
  log(`\n2/${totalSteps} Building player mapping...`);
  ctx.playerMapping = buildPlayerMapping(ctx.replay);

  // Step 3 — player positions
  log(`\n3/${totalSteps} Extracting player positions...`);
  ctx.positions = extractPlayerPositions(ctx.replay);

  // Step 4 — boost stats
  log(`\n4/${totalSteps} Extracting boost stats...`);
  ctx.boostStats = extractBoostStatsV2(ctx.replay);

  // Step 5 — boost pickups
  log(`\n5/${totalSteps} Extracting boost pickups...`);
  ctx.boostPickups = extractBoostPickups(ctx.replay);

  // Step 6 — game timeline
  log(`\n6/${totalSteps} Extracting game timeline...`);
  ctx.timeline = extractGameTimeline(ctx.replay);

  // Step 7 — ball stats
  log(`\n7/${totalSteps} Extracting ball stats...`);
  const { ballStats, ballTimeline } = extractBallStats(ctx.replay);
  ctx.ballStats = ballStats;
  ctx.ballTimeline = ballTimeline;

  // Step 8 — advanced player stats
  log(`\n8/${totalSteps} Extracting advanced player stats...`);
  ctx.advancedStats = extractAdvancedPlayerStats(ctx.replay);

  // Step 9 — match meta
  log(`\n9/${totalSteps} Extracting match meta...`);
  ctx.matchMeta = extractMatchMeta(ctx.replay);

  // Step 10 — combine stats
  log(`\n10/${totalSteps} Combining player stats...`);
  ctx.finalStats = combinePlayerStats({
    boostStats: ctx.boostStats,
    boostPickups: ctx.boostPickups,
    timeline: ctx.timeline,
    ballStats: ctx.ballStats,
    advancedStats: ctx.advancedStats,
    matchMeta: ctx.matchMeta,
  });

  // Step 11 — render Discord cards
  log(`\n11/${totalSteps} Rendering Discord cards...`);
  ctx.discordCards = await renderDiscordCards(ctx.finalStats, ctx.timeline);

  // Step 12 — persist to DB
  log(`\n12/${totalSteps} Persisting to database...`);
  await persistToDb(ctx);

  // Step 13 — post to Discord (skipped in batch/seed mode)
  if (!skipDiscord) {
    log(`\n13/${totalSteps} Posting to Discord...`);
    try {
      await postToDiscord({
        finalStats: ctx.finalStats,
        timeline: ctx.timeline,
        discordCards: ctx.discordCards,
      });
    } catch (err) {
      warn(`  Warning: Discord post failed — ${err.message}`);
    }
  }

  return ctx;
}

async function main() {
  const replayArg = process.argv[2];

  if (!replayArg) {
    console.error("Usage:");
    console.error('  node .\\src\\pipeline\\analyzeReplay.js ".\\replays\\file.replay"');
    process.exit(1);
  }

  const replayPath = resolveReplayPath(replayArg);

  if (!fs.existsSync(replayPath)) {
    throw new Error(`Replay file not found: ${replayPath}`);
  }

  await runPipeline(replayPath);

  console.log("\nAnalysis complete.");
  console.log(`Final stats: ${FINAL_STATS_PATH}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("\nFailed to analyze replay:");
    console.error(error.message);
    process.exit(1);
  });
}
