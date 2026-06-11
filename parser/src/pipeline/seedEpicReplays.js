import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { prisma } from "../../lib/prisma.js";
import { REPLAY_LIBRARY_DIR, REPLAYS_DIR } from "../config/paths.js";
import { parseReplayHeader } from "../repositories/replay.repository.js";
import { runPipeline } from "./analyzeReplay.js";

const DEFAULT_CONCURRENCY = 3;

function parseArgs(argv) {
  const args = {
    dryRun: false,
    force: false,
    noCopy: false,
    truncate: false,
    sourceDir: REPLAY_LIBRARY_DIR,
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--no-copy") args.noCopy = true;
    else if (arg === "--truncate") args.truncate = true;
    else if (arg.startsWith("--dir=")) args.sourceDir = path.resolve(arg.slice("--dir=".length));
    else if (arg.startsWith("--limit=")) {
      const limit = Number(arg.slice("--limit=".length));
      if (Number.isInteger(limit) && limit > 0) args.limit = limit;
    } else if (arg.startsWith("--concurrency=")) {
      const concurrency = Number(arg.slice("--concurrency=".length));
      if (Number.isInteger(concurrency) && concurrency > 0) args.concurrency = concurrency;
    }
  }

  return args;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function truncateDatabase() {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;

  if (!tables.length) {
    console.log("No database tables found to truncate.");
    return;
  }

  const tableList = tables
    .map((row) => `public.${quoteIdentifier(row.table_name)}`)
    .join(", ");

  console.log(`Truncating ${tables.length} database table(s)...`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log("Database truncate complete.\n");
}

async function listReplayFiles(sourceDir) {
  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".replay"))
    .map((entry) => path.join(sourceDir, entry.name));

  files.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  return files;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function safeReplayFileName(replayId, fallbackName) {
  const cleanReplayId = String(replayId ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (cleanReplayId) return `${cleanReplayId}.replay`;
  return path.basename(fallbackName);
}

async function copyReplayIntoAppFolder(sourcePath, replayId) {
  await fs.mkdir(REPLAYS_DIR, { recursive: true });

  const targetPath = path.join(REPLAYS_DIR, safeReplayFileName(replayId, sourcePath));
  if (path.resolve(sourcePath).toLowerCase() === path.resolve(targetPath).toLowerCase()) {
    return targetPath;
  }

  if (await pathExists(targetPath)) return targetPath;

  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}

async function getReplayId(replayPath) {
  const parsed = await parseReplayHeader(replayPath);
  return parsed?.properties?.Id ?? null;
}

async function processWithConcurrency(items, fn, concurrency) {
  let index = 0;
  const results = new Array(items.length);

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (err) {
        results[i] = { status: "rejected", reason: err };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.dryRun && options.truncate) {
    console.log("Dry run enabled - database truncate skipped.");
  } else if (options.truncate) {
    await truncateDatabase();
    options.force = true;
  }

  const replayFiles = await listReplayFiles(options.sourceDir);
  const selectedFiles = options.limit ? replayFiles.slice(0, options.limit) : replayFiles;

  if (selectedFiles.length === 0) {
    console.log("No .replay files found in:", options.sourceDir);
    return;
  }

  console.log("Epic replay source:", options.sourceDir);
  console.log("App replay copy target:", options.noCopy ? "(disabled)" : REPLAYS_DIR);
  console.log(`Found ${replayFiles.length} replay(s). Processing ${selectedFiles.length} with concurrency ${options.concurrency}.`);
  if (options.dryRun) console.log("Dry run enabled - no analysis will be run.\n");
  else console.log("");

  let completed = 0;
  let skipped = 0;
  let failed = 0;

  await processWithConcurrency(selectedFiles, async (sourcePath, arrayIndex) => {
    const fileName = path.basename(sourcePath);
    const displayIndex = arrayIndex + 1;
    const total = selectedFiles.length;

    try {
      const replayId = await getReplayId(sourcePath);
      if (!replayId) {
        throw new Error("Could not read replay ID from header");
      }

      const existing = await prisma.replay.findUnique({
        where: { replayId },
        select: { replayId: true },
      });

      if (existing && !options.force) {
        console.log(`[${displayIndex}/${total}] Already in DB — skipping ${fileName}`);
        skipped++;
        return;
      }

      const replayPath = options.noCopy
        ? sourcePath
        : await copyReplayIntoAppFolder(sourcePath, replayId);

      if (options.dryRun) {
        console.log(`[${displayIndex}/${total}] Would import ${fileName} (${replayId})`);
        skipped++;
        return;
      }

      console.log(`[${displayIndex}/${total}] Importing ${fileName}...`);
      const start = Date.now();
      await runPipeline(replayPath, { skipDiscord: true, silent: true });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      completed++;
      console.log(`[${displayIndex}/${total}] ✓ ${fileName} (${elapsed}s)`);
    } catch (error) {
      failed++;
      console.error(`[${displayIndex}/${total}] ✗ ${fileName}: ${error.message}`);
    }
  }, options.concurrency);

  console.log(`\nEpic replay seed complete: ${completed} imported, ${skipped} skipped, ${failed} failed.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Epic replay seed failed:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
