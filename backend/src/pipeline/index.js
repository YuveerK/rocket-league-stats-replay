import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..", "..");

function run(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exited with code ${code}`));
    });
  });
}

async function main() {
  const replayArg = process.argv[2];
  const extraArgs = process.argv.slice(3);

  if (replayArg) {
    await run(path.join(SCRIPT_DIR, "analyzeReplay.js"), [replayArg]);
    await run(path.join(SCRIPT_DIR, "postToDiscord.js"), extraArgs);
  } else {
    await run(path.join(SCRIPT_DIR, "watchReplays.js"));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
