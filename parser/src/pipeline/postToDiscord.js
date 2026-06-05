import fs from "node:fs/promises";
import path from "node:path";
import {
  getBooleanConfig,
  getConfigValue,
  loadEnv,
  ROOT_DIR,
} from "../utils/config.js";

const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const FINAL_STATS_PATH = path.join(OUTPUT_DIR, "final-player-stats.json");
const TIMELINE_PATH = path.join(OUTPUT_DIR, "game-timeline.json");
const CARD_MANIFEST_PATH = path.join(OUTPUT_DIR, "discord", "discord-card-manifest.json");

const BLUE_COLOR = 0x60a5fa;
const ORANGE_COLOR = 0xfb923c;
const NEUTRAL_COLOR = 0x94a3b8;
const GOLD_COLOR = 0xfacc15;
const PURPLE_COLOR = 0xa78bfa;

const EVENT_LABELS = {
  goal: "GOAL",
  save: "SAVE",
  assist: "AST",
  kill: "DEMO",
  death: "DEATH",
};

const EVENT_EMOJIS = {
  goal: "⚽",
  save: "🛡️",
  assist: "🎯",
  kill: "💥",
  death: "💀",
};

const CARD_TITLES = {
  "match-summary.png": "📊  Match Summary",
  "scoreboard.png": "📋  Scoreboard",
  "team-comparison.png": "⚖️  Team Comparison",
};

const CARD_DESCRIPTIONS = {
  "match-summary.png": "Final score, winner, and standout performers",
  "scoreboard.png": "Full player stats — goals, assists, saves, shots, demos, boost",
  "team-comparison.png": "Head-to-head team stats across all major categories",
};

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, decimals = 0) {
  const number = safeNumber(value);
  return number.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function getTeamScore(players, team) {
  return players
    .filter((player) => player.team === team)
    .reduce((total, player) => total + safeNumber(player.goals), 0);
}

function getWinningColor(team0Score, team1Score) {
  if (team0Score === team1Score) return NEUTRAL_COLOR;
  return team0Score > team1Score ? BLUE_COLOR : ORANGE_COLOR;
}

function clampEmbedColor(value, fallback) {
  if (!value) return fallback;

  const normalized = value.startsWith("#") ? value.slice(1) : value;
  const parsed = Number.parseInt(normalized, 16);

  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function getTopPlayer(players, valueFn) {
  return [...players].sort((a, b) => {
    const valueDiff = safeNumber(valueFn(b)) - safeNumber(valueFn(a));
    if (valueDiff !== 0) return valueDiff;
    return safeNumber(b.score) - safeNumber(a.score);
  })[0];
}

function formatLeader(player, value, suffix = "") {
  if (!player) return "n/a";
  return `**${player.playerName}**\n${value}${suffix}`;
}

function pluralize(count, singular, plural = `${singular}s`) {
  return safeNumber(count) === 1 ? singular : plural;
}

function buildCardEmbeds(cardManifest, embedColor) {
  const cards = cardManifest?.cards ?? [];
  return cards.map((card) => ({
    title: CARD_TITLES[card.filename] ?? "📄  Replay Card",
    description: CARD_DESCRIPTIONS[card.filename] ?? null,
    color: embedColor,
    image: {
      url: `attachment://${card.filename}`,
    },
  }));
}

function buildTopPerformersEmbed(players) {
  if (!players.length) {
    return {
      title: "🏅  Top Performers",
      description: "No players detected.",
      color: GOLD_COLOR,
    };
  }

  const mvp = getTopPlayer(players, (player) => player.score);
  const striker = getTopPlayer(players, (player) => player.goals);
  const goalkeeper = getTopPlayer(players, (player) => player.saves);
  const enforcer = getTopPlayer(players, (player) => player.kills);

  return {
    title: "🏅  Top Performers",
    color: GOLD_COLOR,
    fields: [
      {
        name: "🏆  MVP",
        value: formatLeader(mvp, formatNumber(mvp?.score), " pts"),
        inline: true,
      },
      {
        name: "⚽  Striker",
        value: formatLeader(
          striker,
          formatNumber(striker?.goals),
          ` ${pluralize(striker?.goals, "goal")}`,
        ),
        inline: true,
      },
      {
        name: "🛡️  Goalkeeper",
        value: formatLeader(
          goalkeeper,
          formatNumber(goalkeeper?.saves),
          ` ${pluralize(goalkeeper?.saves, "save")}`,
        ),
        inline: true,
      },
      {
        name: "💥  Enforcer",
        value: formatLeader(
          enforcer,
          formatNumber(enforcer?.kills),
          ` ${pluralize(enforcer?.kills, "demo")}`,
        ),
        inline: true,
      },
    ],
  };
}

function shouldShowTimelineEvent(event) {
  if (event.type === "death" && event.killerPlayerName) return false;
  return ["goal", "save", "assist", "kill", "death"].includes(event.type);
}

function eventImportance(event) {
  if (event.type === "goal") return 5;
  if (event.type === "kill") return 4;
  if (event.type === "save") return 3;
  if (event.type === "assist") return 2;
  return 1;
}

function formatTimelineEvent(event) {
  const label = EVENT_LABELS[event.type] ?? event.type.toUpperCase();
  const emoji = EVENT_EMOJIS[event.type] ?? "▸";
  const time = event.gameClockRemaining ?? event.elapsedClock ?? "?:??";

  if (event.type === "goal") {
    const score = event.scoreAfter
      ? `  *(${event.scoreAfter.team0}–${event.scoreAfter.team1})*`
      : "";
    return `\`${time}\`  ${emoji}  **${label}** — ${event.playerName}${score}`;
  }

  if (event.type === "kill") {
    const victim = event.victimPlayerName ? `  →  ${event.victimPlayerName}` : "";
    return `\`${time}\`  ${emoji}  **${label}** — ${event.playerName}${victim}`;
  }

  return `\`${time}\`  ${emoji}  **${label}** — ${event.playerName}`;
}

function buildTimelineEmbed(events) {
  const rows = (events ?? [])
    .filter(shouldShowTimelineEvent)
    .sort((a, b) => eventImportance(b) - eventImportance(a) || safeNumber(a.elapsedSeconds) - safeNumber(b.elapsedSeconds))
    .slice(0, 10)
    .sort((a, b) => safeNumber(a.elapsedSeconds) - safeNumber(b.elapsedSeconds))
    .map(formatTimelineEvent);

  return {
    title: "⏱️  Key Timeline",
    description: rows.length ? rows.join("\n") : "No key timeline events detected.",
    color: PURPLE_COLOR,
  };
}

function buildPayload(finalStats, timeline, cardManifest = null) {
  const players = finalStats.players ?? [];
  const team0Score = getTeamScore(players, 0);
  const team1Score = getTeamScore(players, 1);
  const embedColor = clampEmbedColor(
    getConfigValue("DISCORD_EMBED_COLOR"),
    getWinningColor(team0Score, team1Score),
  );

  const cardEmbeds = buildCardEmbeds(cardManifest, embedColor);

  return {
    username: getConfigValue("DISCORD_WEBHOOK_USERNAME", "Replay Stats"),
    content: finalStats.matchStartEpoch
      ? `📅  <t:${finalStats.matchStartEpoch}:F>  ·  🏎️  New Rocket League replay analyzed!`
      : "🏎️  New Rocket League replay analyzed!",
    allowed_mentions: { parse: [] },
    embeds: [
      ...cardEmbeds,
      buildTopPerformersEmbed(players),
      buildTimelineEmbed(timeline?.events ?? []),
    ].slice(0, 10),
  };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readJsonOptional(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function getCardFiles(cardManifest) {
  const files = [];

  for (const card of cardManifest?.cards ?? []) {
    const filePath = path.resolve(card.path);
    files.push({
      filename: card.filename,
      data: await fs.readFile(filePath),
    });
  }

  return files;
}

async function postWebhook(webhookUrl, payload, files = []) {
  let body;
  let headers;

  if (files.length > 0) {
    body = new FormData();
    body.append("payload_json", JSON.stringify(payload));

    files.forEach((file, index) => {
      body.append(
        `files[${index}]`,
        new Blob([file.data], { type: "image/png" }),
        file.filename,
      );
    });
  } else {
    headers = {
      "Content-Type": "application/json",
    };
    body = JSON.stringify(payload);
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${body}`);
  }
}

async function main() {
  loadEnv();

  const dryRun =
    process.argv.includes("--dry-run") || getBooleanConfig("DISCORD_DRY_RUN");
  const webhookUrl = getConfigValue("DISCORD_WEBHOOK_URL");

  const finalStats = await readJson(FINAL_STATS_PATH);
  const timeline = await readJson(TIMELINE_PATH);
  const cardManifest = await readJsonOptional(CARD_MANIFEST_PATH);
  const payload = buildPayload(finalStats, timeline, cardManifest);
  const files = await getCardFiles(cardManifest);

  if (dryRun) {
    console.log("Discord dry run payload:");
    console.log(JSON.stringify(payload, null, 2));
    console.log(
      `\nAttachments: ${files.length > 0 ? files.map((f) => f.filename).join(", ") : "none"}`,
    );
    return;
  }

  if (!webhookUrl) {
    throw new Error(
      "DISCORD_WEBHOOK_URL is not set. Add it to .env or run with --dry-run.",
    );
  }

  await postWebhook(webhookUrl, payload, files);
  console.log("Posted replay stats to Discord.");
}

main().catch((error) => {
  console.error("Failed to post replay stats to Discord:");
  console.error(error.message);
  process.exit(1);
});
