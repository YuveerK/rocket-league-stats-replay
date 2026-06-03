import { spawnAnalysis, formatStepLabel } from "../services/analysis.service.js";

export function analyzeReplay(req, res) {
  const { replayPath } = req.query;
  if (!replayPath) return res.status(400).json({ error: "replayPath is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const child = spawnAnalysis(replayPath);

  let stdoutBuf = "";
  child.stdout.on("data", (chunk) => {
    stdoutBuf += chunk.toString();
    const lines = stdoutBuf.split("\n");
    stdoutBuf = lines.pop();
    for (const line of lines) {
      const m = line.match(/^(\d+)\/(\d+)\s+(.+)/);
      if (m) {
        send({
          type: "step",
          step: parseInt(m[1]),
          total: parseInt(m[2]),
          label: formatStepLabel(m[3].trim()),
        });
      }
    }
  });

  let stderrBuf = "";
  child.stderr.on("data", (chunk) => { stderrBuf += chunk.toString(); });

  child.on("close", (code) => {
    if (code === 0) {
      send({ type: "complete" });
    } else {
      const msg = stderrBuf.split("\n").find((l) => l.trim()) ?? "Analysis failed";
      send({ type: "error", message: msg });
    }
    res.end();
  });

  req.on("close", () => child.kill());
}
