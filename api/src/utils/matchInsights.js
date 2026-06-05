const TEAM_LABELS = { 0: "Blue", 1: "Orange" };

function latestBallSampleBefore(ballSamples, elapsedSeconds) {
  if (!ballSamples?.length || elapsedSeconds == null) return null;
  let lo = 0;
  let hi = ballSamples.length - 1;
  let best = null;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const sample = ballSamples[mid];
    const t = sample.elapsedSeconds ?? 0;
    if (t <= elapsedSeconds) {
      best = sample;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function buildGoalBreakdown(timelineEvents, ballSamples, players) {
  const playerTeams = new Map((players ?? []).map((p) => [p.playerName, p.team]));

  return (timelineEvents ?? [])
    .filter((e) => e.type === "goal")
    .map((goal, index) => {
      const elapsed = goal.elapsedSeconds ?? goal.gameClockElapsedSeconds ?? goal.timelineElapsedSeconds;
      const ball = latestBallSampleBefore(ballSamples, elapsed);
      const lastTouchTeam = ball?.lastTouchTeam ?? null;
      const scoringTeam = goal.team;
      const touchLabel =
        lastTouchTeam === 0 ? "Blue"
        : lastTouchTeam === 1 ? "Orange"
        : "Unknown";

      const isOwnGoal =
        lastTouchTeam != null &&
        scoringTeam != null &&
        lastTouchTeam !== scoringTeam;

      return {
        id: goal.id ?? `goal-${index}`,
        index: index + 1,
        elapsedSeconds: elapsed,
        scorerName: goal.playerName,
        scoringTeam,
        scoringTeamLabel: TEAM_LABELS[scoringTeam] ?? "Unknown",
        scoreAfter: goal.scoreAfter ?? null,
        lastTouchTeam,
        lastTouchLabel: touchLabel,
        isOwnGoal,
        assistNote:
          lastTouchTeam != null && lastTouchTeam === scoringTeam && goal.playerName
            ? `Scored by ${goal.playerName}`
            : null,
      };
    });
}

export function buildDemoMatrix(timelineEvents, players) {
  const names = (players ?? []).map((p) => p.playerName).filter(Boolean);
  const matrixMap = new Map();

  for (const event of timelineEvents ?? []) {
    if (event.type !== "kill") continue;
    const attacker = event.playerName;
    const victim = event.victimPlayerName;
    if (!attacker || !victim) continue;
    const key = `${attacker}→${victim}`;
    matrixMap.set(key, (matrixMap.get(key) ?? 0) + 1);
  }

  const cells = [...matrixMap.entries()]
    .map(([key, count]) => {
      const [attacker, victim] = key.split("→");
      return { attacker, victim, count };
    })
    .sort((a, b) => b.count - a.count);

  const totalsByAttacker = new Map();
  const totalsByVictim = new Map();
  for (const { attacker, victim, count } of cells) {
    totalsByAttacker.set(attacker, (totalsByAttacker.get(attacker) ?? 0) + count);
    totalsByVictim.set(victim, (totalsByVictim.get(victim) ?? 0) + count);
  }

  return {
    players: names,
    cells,
    topPair: cells[0] ?? null,
    totalsByAttacker: Object.fromEntries(totalsByAttacker),
    totalsByVictim: Object.fromEntries(totalsByVictim),
    totalDemos: cells.reduce((sum, c) => sum + c.count, 0),
  };
}
