import { readFile } from "fs/promises";
import { parseReplay } from "./headerParser.js";
import { parseNetworkFrames } from "./networkParser.js";
import { BitReader } from "./BitReader.js";

/**
 * Parse a .replay file and return an rrrocket-compatible JSON object.
 * Throws on parse errors so the caller can fall back to header-only mode.
 */
export async function parseReplayFile(replayPath) {
  const buf = await readFile(replayPath);
  const replay = parseReplay(buf);

  let network_frames = { frames: [] };
  try {
    const bits = new BitReader(replay._networkData);
    network_frames = parseNetworkFrames(replay, bits);
  } catch (err) {
    // Re-throw so analyzeReplay.js can decide whether to fall back to header-only
    throw err;
  }

  const { _networkData, ...headerFields } = replay;
  return { ...headerFields, network_frames };
}

/**
 * Parse only the header section of a .replay file, returning an object with
 * empty network_frames. Used as a last-resort fallback when network parsing
 * fails and rrrocket is unavailable. Boost/position stats will be missing.
 */
export async function parseReplayHeaderOnly(replayPath) {
  const buf = await readFile(replayPath);
  const replay = parseReplay(buf);
  const { _networkData, ...headerFields } = replay;
  return { ...headerFields, network_frames: { frames: [] }, _headerOnly: true };
}
