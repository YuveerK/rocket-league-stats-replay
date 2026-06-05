import { Ollama } from "ollama";
import {
  getBooleanConfig,
  getConfigValue,
  getNumberConfig,
} from "../utils/config.js";

const ROAST_COLOR = 0xef4444;
// qwen3:8b
// llama3.2:3b
const DEFAULT_MODEL = "qwen3:8b";
const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 45000;

const ELIGIBLE_PLAYERS = new Map(
  ["Malume_Donz_zA", "X_SpartanGamer_X", "stef_leovac"].map((name) => [
    name.toLowerCase(),
    name,
  ]),
);

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, decimals = 0) {
  return safeNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function pluralize(value, singular, plural = `${singular}s`) {
  return safeNumber(value) === 1 ? singular : plural;
}

function normalizeName(name) {
  return String(name ?? "").toLowerCase();
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function selectEligiblePlayers(players) {
  return (players ?? [])
    .filter((player) => ELIGIBLE_PLAYERS.has(normalizeName(player.playerName)))
    .map((player) => ({
      ...player,
      playerName:
        ELIGIBLE_PLAYERS.get(normalizeName(player.playerName)) ??
        player.playerName,
    }));
}

function compareLastPlace(a, b) {
  return (
    safeNumber(a.score) - safeNumber(b.score) ||
    safeNumber(a.goals) - safeNumber(b.goals) ||
    safeNumber(a.saves) - safeNumber(b.saves) ||
    safeNumber(a.shots) - safeNumber(b.shots) ||
    safeNumber(b.deaths) - safeNumber(a.deaths) ||
    String(a.playerName).localeCompare(String(b.playerName))
  );
}

function teamName(team) {
  return team === 1 ? "Orange" : "Blue";
}

function selectRoastTarget(players) {
  const eligible = selectEligiblePlayers(players).sort(compareLastPlace);
  return {
    eligible,
    target: eligible[0] ?? null,
  };
}

function sumPlayers(players, field) {
  return (players ?? []).reduce(
    (total, player) => total + safeNumber(player[field]),
    0,
  );
}

function getTeamPlayers(players, team) {
  return (players ?? []).filter((player) => player.team === team);
}

function getPlayerRank(players, target, field, direction = "desc") {
  const sorted = [...(players ?? [])].sort((a, b) => {
    const diff = safeNumber(b[field]) - safeNumber(a[field]);
    return direction === "desc" ? diff : -diff;
  });

  return (
    sorted.findIndex((player) => player.playerName === target.playerName) + 1
  );
}

function buildMatchContext(finalStats, target) {
  const players = finalStats.players ?? [];
  const bluePlayers = getTeamPlayers(players, 0);
  const orangePlayers = getTeamPlayers(players, 1);
  const targetTeamPlayers = getTeamPlayers(players, target.team);
  const teamGoals = sumPlayers(targetTeamPlayers, "goals");
  const teamShots = sumPlayers(targetTeamPlayers, "shots");

  return {
    blueGoals: sumPlayers(bluePlayers, "goals"),
    orangeGoals: sumPlayers(orangePlayers, "goals"),
    targetTeam: teamName(target.team),
    targetTeamGoals: teamGoals,
    targetTeamShots: teamShots,
    overallScoreRank: getPlayerRank(players, target, "score"),
    playerCount: players.length,
    teamScoreRank: getPlayerRank(targetTeamPlayers, target, "score"),
    teamPlayerCount: targetTeamPlayers.length,
  };
}

function createRoastAngles(target, context) {
  const angles = [];
  const score = safeNumber(target.score);
  const goals = safeNumber(target.goals);
  const assists = safeNumber(target.assists);
  const saves = safeNumber(target.saves);
  const shots = safeNumber(target.shots);
  const deaths = safeNumber(target.deaths);
  const kills = safeNumber(target.kills);

  if (score < 100) {
    angles.push(
      `${formatNumber(score)} score is barely visible on the scoreboard`,
    );
  }
  if (goals === 0) angles.push("0 goals");
  if (shots === 0) angles.push("0 shots, so they did not even test the net");
  if (saves === 0) angles.push("0 saves");
  if (assists > 0 && goals === 0 && shots === 0) {
    angles.push(
      `${formatNumber(assists)} assist was their only real contribution`,
    );
  }
  if (deaths > kills) {
    angles.push(
      `${formatNumber(deaths)} deaths with ${formatNumber(kills)} demos`,
    );
  }
  if (context.teamScoreRank === context.teamPlayerCount) {
    angles.push(`last on ${context.targetTeam} by score`);
  }
  if (context.overallScoreRank === context.playerCount) {
    angles.push("lowest score in the lobby");
  }

  return angles.slice(0, 5);
}

function createRequiredRoastFacts(target) {
  const facts = [
    `${formatNumber(target.score)} score`,
    `${formatNumber(target.goals)} ${pluralize(target.goals, "goal")}`,
    `${formatNumber(target.shots)} ${pluralize(target.shots, "shot")}`,
    `${formatNumber(target.saves)} ${pluralize(target.saves, "save")}`,
    `${formatNumber(target.deaths)} ${pluralize(target.deaths, "death")}`,
  ];

  if (safeNumber(target.assists) > 0) {
    facts.push(
      `${formatNumber(target.assists)} ${pluralize(target.assists, "assist")}`,
    );
  }

  return facts;
}

function summarizePlayer(player) {
  return {
    playerName: player.playerName,
    team: teamName(player.team),
    score: safeNumber(player.score),
    goals: safeNumber(player.goals),
    assists: safeNumber(player.assists),
    saves: safeNumber(player.saves),
    shots: safeNumber(player.shots),
    shootingPercentage: safeNumber(player.shootingPercentage),
    kills: safeNumber(player.kills),
    deaths: safeNumber(player.deaths),
    boostUsed: safeNumber(player.boostUsed),
    bpm: safeNumber(player.bpm),
    boostCollectedApprox: safeNumber(player.boostCollectedApprox),
    zeroBoostSeconds: safeNumber(player.zeroBoostSeconds),
    fullBoostSeconds: safeNumber(player.fullBoostSeconds),
    pickups: safeNumber(player.pickups),
    bigPads: safeNumber(player.bigPads),
    smallPads: safeNumber(player.smallPads),
    boostStolen: safeNumber(player.boostStolen),
    avgSpeedUU: safeNumber(player.avgSpeedUU),
    maxSpeedUU: safeNumber(player.maxSpeedUU),
    supersonicPct: safeNumber(player.supersonicPct),
    airbornePct: safeNumber(player.airbornePct),
  };
}

function createRoastInput(finalStats, eligible, target) {
  const matchContext = buildMatchContext(finalStats, target);

  return {
    replayName: finalStats.replayName ?? "Rocket League Replay",
    mapName: finalStats.mapName ?? "Unknown map",
    matchDurationSeconds: safeNumber(finalStats.totalSecondsPlayed),
    matchContext,
    roastAngles: createRoastAngles(target, matchContext),
    requiredFacts: createRequiredRoastFacts(target),
    targetPlayer: summarizePlayer(target),
    whitelistedPlayers: eligible.map(summarizePlayer),
  };
}

function fallbackRoast(target, reason = "local fallback") {
  const goals = safeNumber(target.goals);
  const saves = safeNumber(target.saves);
  const shots = safeNumber(target.shots);
  const score = safeNumber(target.score);
  const deaths = safeNumber(target.deaths);

  const roast =
    `${target.playerName} put up ${formatNumber(score)} score with ` +
    `${formatNumber(goals)} ${pluralize(goals, "goal")}, ` +
    `${formatNumber(saves)} ${pluralize(saves, "save")}, ` +
    `${formatNumber(shots)} ${pluralize(shots, "shot")} and ` +
    `${formatNumber(deaths)} ${pluralize(deaths, "death")}; ` +
    "that stat line did not need a replay parser, it needed a witness protection program.";

  return {
    title: `AI Roast - ${target.playerName}`,
    description: roast,
    color: ROAST_COLOR,
    fields: [
      {
        name: "Stat line",
        value: buildStatLine(target),
        inline: false,
      },
    ],
    footer: { text: `Local roast fallback - ${reason}` },
  };
}

function buildStatLine(player) {
  return [
    `${formatNumber(player.score)} score`,
    `${formatNumber(player.goals)} ${pluralize(player.goals, "goal")}`,
    `${formatNumber(player.assists)} ${pluralize(player.assists, "assist")}`,
    `${formatNumber(player.saves)} ${pluralize(player.saves, "save")}`,
    `${formatNumber(player.shots)} ${pluralize(player.shots, "shot")}`,
    `${formatNumber(player.deaths)} ${pluralize(player.deaths, "death")}`,
  ].join(" | ");
}

function parseJsonObject(content) {
  const text = String(content ?? "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Ollama did not return a JSON object.");
    }

    return JSON.parse(text.slice(start, end + 1));
  }
}

function normalizeRoastResponse(content, target) {
  const rawText = cleanText(content, 900);

  try {
    const parsed = parseJsonObject(content);

    if (typeof parsed === "string") {
      return {
        title: `AI Roast - ${target.playerName}`,
        roast: cleanText(parsed, 900),
        statLine: buildStatLine(target),
      };
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Ollama did not return text or a JSON object.");
    }

    const roast =
      parsed.roast ??
      parsed.description ??
      parsed.text ??
      parsed.message ??
      rawText;

    return {
      title: cleanText(parsed.title, 90) || `AI Roast - ${target.playerName}`,
      roast: cleanText(roast, 900),
      statLine: cleanText(parsed.statLine, 400) || buildStatLine(target),
    };
  } catch {
    return {
      title: `AI Roast - ${target.playerName}`,
      roast: rawText,
      statLine: buildStatLine(target),
    };
  }
}

function createTimeoutFetch(timeoutMs) {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

async function askOllamaForRoast(input, target) {
  const host = getConfigValue("OLLAMA_HOST", DEFAULT_HOST);
  const model = getConfigValue("OLLAMA_MODEL", DEFAULT_MODEL);
  const timeoutMs = getNumberConfig("OLLAMA_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const client = new Ollama({
    host,
    fetch: createTimeoutFetch(timeoutMs),
  });

  const response = await client.chat({
    model,
    think: false,
    stream: false,
    options: {
      temperature: 1,
      num_predict: 120,
    },
    messages: [
      {
        role: "system",
        content:
          "You are the most savage Rocket League post-match trash-talker alive. " +
          "Your only job: humiliate the target player using their gameplay stats. " +
          "Rules: " +
          "- ONE sentence. Make it land like a brick. " +
          "- Mock their actual numbers ruthlessly: a goose egg on goals, saves they whiffed, boost they hoarded like a dragon for nothing, supersonic % of a parked car. " +
          "- Treat their stat line as a crime scene. Be merciless, creative, and unhinged about the GAMEPLAY only. " +
          "- Compare them to sad things: AFK bots, a traffic cone, a spectator who wandered onto the pitch, a demo dummy. " +
          "- Twist the knife. They finished DEAD LAST and everyone watched. " +
          "Stay 100% on gameplay and stats. No mention of real-life people, looks, or anything off the field. " +
          "Return only the roast sentence. No markdown, no preface, no JSON.",
      },
      {
        role: "user",
        content: [
          `Target: ${input.targetPlayer.playerName}`,
          `Match score: Blue ${input.matchContext.blueGoals} - Orange ${input.matchContext.orangeGoals}`,
          `Target team: ${input.matchContext.targetTeam}`,
          `Target team goals: ${input.matchContext.targetTeamGoals}`,
          `Target score rank: ${input.matchContext.overallScoreRank} of ${input.matchContext.playerCount}`,
          `Target team score rank: ${input.matchContext.teamScoreRank} of ${input.matchContext.teamPlayerCount}`,
          `Score: ${input.targetPlayer.score}`,
          `Goals: ${input.targetPlayer.goals}`,
          `Assists: ${input.targetPlayer.assists}`,
          `Saves: ${input.targetPlayer.saves}`,
          `Shots: ${input.targetPlayer.shots}`,
          `Deaths: ${input.targetPlayer.deaths}`,
          `Required facts to use exactly: ${input.requiredFacts.join("; ")}`,
          `Best roast angles: ${input.roastAngles.join("; ")}`,
          "Do not say the match was tied unless Match score is tied.",
          "Do not use first person.",
          "Use at least two Required facts exactly as written.",
          "Write the hardest gameplay-only chirp now.",
        ].join("\n"),
      },
    ],
  });

  const parsed = normalizeRoastResponse(response?.message?.content, target);
  const title = cleanText(parsed.title, 90);
  const roast = cleanText(parsed.roast, 900);
  const statLine = cleanText(parsed.statLine, 400);

  if (!title || !roast) {
    console.warn(
      `Ollama returned empty content. Raw: ${JSON.stringify(response?.message?.content)}`,
    );
    throw new Error("Ollama roast was empty.");
  }

  return {
    title,
    description: roast,
    color: ROAST_COLOR,
    fields: statLine
      ? [
          {
            name: "Stat line",
            value: statLine,
            inline: false,
          },
        ]
      : [],
    footer: { text: `Local Ollama - ${model}` },
  };
}

export async function buildPlayerRoastEmbed(finalStats) {
  if (!getBooleanConfig("DISCORD_AI_ROAST_ENABLED", true)) return null;

  const { eligible, target } = selectRoastTarget(finalStats.players ?? []);
  if (!target) return null;

  const input = createRoastInput(finalStats, eligible, target);

  try {
    return await askOllamaForRoast(input, target);
  } catch (error) {
    console.warn(`Ollama roast unavailable: ${error.message}`);
    const fallbackReason =
      error.name === "AbortError"
        ? "timeout"
        : error.message.includes("ungrounded")
          ? "ungrounded ollama output"
          : "ollama unavailable";

    return fallbackRoast(target, fallbackReason);
  }
}
