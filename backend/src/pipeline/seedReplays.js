import "dotenv/config";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";
import { loadEnv, getConfigValue, ROOT_DIR } from "../utils/config.js";
import { prisma } from "../../lib/prisma.js";

const DEFAULT_REPLAY_DIR = path.join(ROOT_DIR, "replays");

function runPipeline(replayPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(ROOT_DIR, "src", "pipeline", "analyzeReplay.js"), replayPath],
      { cwd: ROOT_DIR, stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`analyzeReplay.js exited with code ${code}`));
    });
  });
}

async function listReplays(dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".replay"))
      .map((e) => path.join(dir, e.name));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function main() {
  loadEnv();

  const replayDir = getConfigValue("REPLAY_WATCH_DIR") ?? DEFAULT_REPLAY_DIR;
  const replayPaths = await listReplays(replayDir);

  if (replayPaths.length === 0) {
    console.log("No replay files found in:", replayDir);
    return;
  }

  console.log(`Found ${replayPaths.length} replay(s) in ${replayDir}`);
  console.log("Checking which are already in the database...\n");

  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < replayPaths.length; i++) {
    const replayPath = replayPaths[i];
    const fileName = path.basename(replayPath);
    const replayId = path.basename(replayPath, ".replay");
    const progress = `[${i + 1}/${replayPaths.length}]`;

    const existing = await prisma.replay.findUnique({ where: { replayId }, select: { replayId: true } });
    if (existing) {
      console.log(`${progress} Already in DB — skipping ${fileName}`);
      skipped++;
      continue;
    }

    console.log(`${progress} Seeding ${fileName}...`);
    try {
      await runPipeline(replayPath);
      seeded++;
    } catch (err) {
      console.error(`${progress} FAILED ${fileName}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nSeed complete: ${seeded} inserted, ${skipped} skipped, ${failed} failed.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (err) => {
    console.error("Seed failed:", err.message);
    await prisma.$disconnect();
    process.exit(1);
  });
