import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export const BACKEND_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

export const OUTPUT_DIR = path.join(BACKEND_DIR, "output");
export const REPLAYS_DIR = path.join(BACKEND_DIR, "replays");
export const RRROCKET_PATH = path.join(BACKEND_DIR, "tools", "rrrocket.exe");
export const REPLAY_LIBRARY_PATH = path.join(OUTPUT_DIR, "replay-library.json");

const DEFAULT_REPLAY_LIBRARY_DIR = path.join(
  os.homedir(),
  "Documents",
  "My Games",
  "Rocket League",
  "TAGame",
  "DemosEpic",
);

export const REPLAY_LIBRARY_DIR = process.env.REPLAY_LIBRARY_DIR
  ? path.resolve(process.env.REPLAY_LIBRARY_DIR)
  : DEFAULT_REPLAY_LIBRARY_DIR;
