import "dotenv/config";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { prisma } from "../../lib/prisma.js";
import { BACKEND_DIR, REPLAY_LIBRARY_DIR, REPLAYS_DIR } from "../config/paths.js";
import { parseReplayHeader } from "../repositories/replay.repository.js";

function parseArgs(argv) {
  const args = {
    dryRun: false,
    force: false,
    noCopy: false,
    truncate: false,
    sourceDir: REPLAY_LIBRARY_DIR,
    limit: null,
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

function runPipeline(replayPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(BACKEND_DIR, "src", "pipeline", "analyzeReplay.js"), replayPath],
      { cwd: BACKEND_DIR, stdio: "inherit" },
    );

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`analyzeReplay.js exited with code ${code}`));
    });
  });
}

async function getReplayId(replayPath) {
  const parsed = await parseReplayHeader(replayPath);
  return parsed?.properties?.Id ?? null;
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
  console.log(`Found ${replayFiles.length} replay(s). Processing ${selectedFiles.length}.`);
  if (options.dryRun) console.log("Dry run enabled - no analysis will be run.\n");
  else console.log("");

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < selectedFiles.length; index++) {
    const sourcePath = selectedFiles[index];
    const fileName = path.basename(sourcePath);
    const progress = `[${index + 1}/${selectedFiles.length}]`;

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
        console.log(`${progress} Already in DB - skipping ${fileName} (${replayId})`);
        skipped++;
        continue;
      }

      const replayPath = options.noCopy
        ? sourcePath
        : await copyReplayIntoAppFolder(sourcePath, replayId);

      if (options.dryRun) {
        console.log(`${progress} Would import ${fileName} as ${path.basename(replayPath)} (${replayId})`);
        skipped++;
        continue;
      }

      console.log(`${progress} Importing ${fileName} (${replayId})...`);
      await runPipeline(replayPath);
      imported++;
    } catch (error) {
      failed++;
      console.error(`${progress} FAILED ${fileName}: ${error.message}`);
    }
  }

  console.log(`\nEpic replay seed complete: ${imported} imported, ${skipped} skipped, ${failed} failed.`);
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
