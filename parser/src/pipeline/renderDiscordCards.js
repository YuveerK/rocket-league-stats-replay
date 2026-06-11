import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ROOT_DIR } from "../utils/config.js";

const OUTPUT_DIR = path.join(ROOT_DIR, "output");
const CARD_DIR = path.join(OUTPUT_DIR, "discord");
const FINAL_STATS_PATH = path.join(OUTPUT_DIR, "final-player-stats.json");
const TIMELINE_PATH = path.join(OUTPUT_DIR, "game-timeline.json");
const MANIFEST_PATH = path.join(CARD_DIR, "discord-card-manifest.json");

const BLUE = "#60a5fa";
const ORANGE = "#fb923c";
const GREEN = "#34d399";
const RED = "#f43f5e";
const PURPLE = "#a78bfa";
const GOLD = "#facc15";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const PANEL = "#0c0f1a";
const BORDER = "rgba(255,255,255,0.10)";

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

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(safeNumber(seconds)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncate(value, max = 22) {
  const text = String(value ?? "Unknown");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function teamName(team) {
  return team === 1 ? "Orange" : "Blue";
}

function teamColor(team) {
  return team === 1 ? ORANGE : BLUE;
}

function getTeamScore(players, team) {
  return players
    .filter((player) => player.team === team)
    .reduce((total, player) => total + safeNumber(player.goals), 0);
}

function getTeamTotals(players, team) {
  const teamPlayers = players.filter((player) => player.team === team);
  const goals = teamPlayers.reduce((sum, p) => sum + safeNumber(p.goals), 0);
  const shots = teamPlayers.reduce((sum, p) => sum + safeNumber(p.shots), 0);
  return {
    goals,
    shots,
    assists: teamPlayers.reduce((sum, p) => sum + safeNumber(p.assists), 0),
    saves: teamPlayers.reduce((sum, p) => sum + safeNumber(p.saves), 0),
    demos: teamPlayers.reduce((sum, p) => sum + safeNumber(p.kills), 0),
    boostUsed: teamPlayers.reduce((sum, p) => sum + safeNumber(p.boostUsed), 0),
    boostCollected: teamPlayers.reduce((sum, p) => sum + safeNumber(p.boostCollectedApprox), 0),
    bpm: teamPlayers.reduce((sum, p) => sum + safeNumber(p.bpm), 0),
    boostStolen: teamPlayers.reduce((sum, p) => sum + safeNumber(p.boostStolen), 0),
    bigPads: teamPlayers.reduce((sum, p) => sum + safeNumber(p.bigPads), 0),
    smallPads: teamPlayers.reduce((sum, p) => sum + safeNumber(p.smallPads), 0),
    shootingPct: shots > 0 ? (goals / shots) * 100 : 0,
  };
}

function getTopPlayer(players, valueFn) {
  return [...players].sort((a, b) => {
    const diff = safeNumber(valueFn(b)) - safeNumber(valueFn(a));
    if (diff !== 0) return diff;
    return safeNumber(b.score) - safeNumber(a.score);
  })[0];
}

function winnerLabel(team0Score, team1Score) {
  if (team0Score === team1Score) return "Draw";
  return team0Score > team1Score ? "Blue wins" : "Orange wins";
}

function cardShell(width, height, body, defs = "") {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0b1020"/>
          <stop offset="52%" stop-color="#05070f"/>
          <stop offset="100%" stop-color="#0b1020"/>
        </linearGradient>
        <radialGradient id="blueGlow" cx="16%" cy="8%" r="50%">
          <stop offset="0%" stop-color="rgba(96,165,250,0.28)"/>
          <stop offset="100%" stop-color="rgba(96,165,250,0)"/>
        </radialGradient>
        <radialGradient id="orangeGlow" cx="84%" cy="8%" r="48%">
          <stop offset="0%" stop-color="rgba(251,146,60,0.24)"/>
          <stop offset="100%" stop-color="rgba(251,146,60,0)"/>
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.36"/>
        </filter>
        ${defs}
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect width="${width}" height="${height}" fill="url(#blueGlow)"/>
      <rect width="${width}" height="${height}" fill="url(#orangeGlow)"/>
      <rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="32" fill="rgba(255,255,255,0.025)" stroke="${BORDER}"/>
      ${body}
    </svg>
  `;
}

function metricPill(x, y, w, label, value, color) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="98" rx="20" fill="${color}18" stroke="${color}55"/>
    <text x="${x + 22}" y="${y + 34}" fill="${MUTED}" font-family="Inter, Segoe UI, Arial" font-size="18" font-weight="800" letter-spacing="2">${escapeXml(label)}</text>
    <text x="${x + 22}" y="${y + 74}" fill="${color}" font-family="Inter, Segoe UI, Arial" font-size="34" font-weight="900">${escapeXml(value)}</text>
  `;
}

function renderMatchSummarySvg(finalStats) {
  const players = finalStats.players ?? [];
  const blueScore = getTeamScore(players, 0);
  const orangeScore = getTeamScore(players, 1);
  const winner = winnerLabel(blueScore, orangeScore);
  const replayName = finalStats.replayName ?? "Rocket League Replay";
  const mapName = finalStats.mapName ?? "Unknown map";
  const mvp = getTopPlayer(players, (player) => player.score);
  const striker = getTopPlayer(players, (player) => player.goals);
  const enforcer = getTopPlayer(players, (player) => player.kills);
  const booster = getTopPlayer(players, (player) => player.boostUsed);
  const winnerColor = blueScore === orangeScore ? "#e5e7eb" : blueScore > orangeScore ? BLUE : ORANGE;

  const body = `
    <text x="70" y="94" fill="${MUTED}" font-family="Inter, Segoe UI, Arial" font-size="18" font-weight="900" letter-spacing="3">ROCKET LEAGUE REPLAY</text>
    <text x="70" y="144" fill="${TEXT}" font-family="Inter, Segoe UI, Arial" font-size="44" font-weight="900">${escapeXml(truncate(replayName, 42))}</text>
    <text x="70" y="182" fill="${MUTED}" font-family="Inter, Segoe UI, Arial" font-size="22" font-weight="700">${escapeXml(mapName)} - ${escapeXml(formatDuration(finalStats.totalSecondsPlayed))}${finalStats.overtime ? " - Overtime" : ""}${finalStats.forfeit ? " - Forfeit" : ""}</text>

    <rect x="70" y="230" width="1260" height="250" rx="32" fill="${PANEL}" stroke="${BORDER}" filter="url(#softShadow)"/>
    <text x="190" y="304" fill="${BLUE}" font-family="Inter, Segoe UI, Arial" font-size="32" font-weight="900">BLUE</text>
    <text x="190" y="405" fill="${BLUE}" font-family="Inter, Segoe UI, Arial" font-size="112" font-weight="950">${blueScore}</text>
    <text x="700" y="384" fill="rgba(255,255,255,0.26)" font-family="Inter, Segoe UI, Arial" font-size="56" font-weight="900" text-anchor="middle">VS</text>
    <text x="1210" y="304" fill="${ORANGE}" font-family="Inter, Segoe UI, Arial" font-size="32" font-weight="900" text-anchor="end">ORANGE</text>
    <text x="1210" y="405" fill="${ORANGE}" font-family="Inter, Segoe UI, Arial" font-size="112" font-weight="950" text-anchor="end">${orangeScore}</text>
    <rect x="548" y="420" width="304" height="44" rx="22" fill="${winnerColor}22" stroke="${winnerColor}55"/>
    <text x="700" y="449" fill="${winnerColor}" font-family="Inter, Segoe UI, Arial" font-size="20" font-weight="900" text-anchor="middle">${escapeXml(winner.toUpperCase())}</text>

    ${metricPill(70, 520, 290, "MVP", truncate(mvp?.playerName, 15), GOLD)}
    ${metricPill(390, 520, 290, "STRIKER", `${truncate(striker?.playerName, 13)} (${formatNumber(striker?.goals)})`, GREEN)}
    ${metricPill(710, 520, 290, "ENFORCER", `${truncate(enforcer?.playerName, 13)} (${formatNumber(enforcer?.kills)})`, RED)}
    ${metricPill(1030, 520, 300, "BOOST LEADER", `${truncate(booster?.playerName, 12)} (${formatNumber(booster?.boostUsed)})`, PURPLE)}

    <text x="70" y="744" fill="rgba(255,255,255,0.34)" font-family="Inter, Segoe UI, Arial" font-size="18" font-weight="700">Generated by rocket-replay-parser</text>
  `;

  return cardShell(1400, 800, body);
}

function renderScoreboardSvg(finalStats) {
  const players = [...(finalStats.players ?? [])].sort((a, b) => {
    if (a.team !== b.team) return (a.team ?? 99) - (b.team ?? 99);
    return safeNumber(b.score) - safeNumber(a.score);
  });
  const headers = [
    ["PLAYER", 90], ["SCORE", 500], ["G", 650], ["A", 740],
    ["SV", 830], ["SH", 930], ["DM", 1030], ["BOOST", 1140],
  ];
  const rowH = 74;
  const startY = 270;

  const rows = players.map((player, index) => {
    const y = startY + index * rowH;
    const color = teamColor(player.team);
    return `
      <rect x="64" y="${y - 42}" width="1272" height="58" rx="18" fill="${index % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)"}" stroke="rgba(255,255,255,0.045)"/>
      <circle cx="96" cy="${y - 13}" r="8" fill="${color}"/>
      <text x="120" y="${y - 4}" fill="${TEXT}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850">${escapeXml(truncate(player.playerName, 22))}</text>
      <text x="540" y="${y - 4}" fill="${TEXT}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.score)}</text>
      <text x="668" y="${y - 4}" fill="${GREEN}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.goals)}</text>
      <text x="758" y="${y - 4}" fill="${PURPLE}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.assists)}</text>
      <text x="858" y="${y - 4}" fill="${GOLD}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.saves)}</text>
      <text x="958" y="${y - 4}" fill="${TEXT}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.shots)}</text>
      <text x="1065" y="${y - 4}" fill="${RED}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.kills)}</text>
      <text x="1225" y="${y - 4}" fill="${BLUE}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="850" text-anchor="end">${formatNumber(player.boostUsed)}</text>
    `;
  }).join("");

  const body = `
    <text x="70" y="96" fill="${MUTED}" font-family="Inter, Segoe UI, Arial" font-size="18" font-weight="900" letter-spacing="3">MATCH SCOREBOARD</text>
    <text x="70" y="146" fill="${TEXT}" font-family="Inter, Segoe UI, Arial" font-size="44" font-weight="900">${escapeXml(truncate(finalStats.replayName ?? "Rocket League Replay", 40))}</text>
    <rect x="64" y="176" width="1272" height="${Math.max(180, players.length * rowH + 96)}" rx="28" fill="${PANEL}" stroke="${BORDER}" filter="url(#softShadow)"/>
    ${headers.map(([label, x]) => `<text x="${x}" y="214" fill="${MUTED}" font-family="Inter, Segoe UI, Arial" font-size="16" font-weight="900" letter-spacing="2">${label}</text>`).join("")}
    ${rows}
    <text x="70" y="824" fill="rgba(255,255,255,0.30)" font-family="Inter, Segoe UI, Arial" font-size="17" font-weight="700">DM = demolitions inflicted - BOOST = boost used</text>
  `;

  return cardShell(1400, 880, body);
}

function renderTeamComparisonSvg(finalStats) {
  const players = finalStats.players ?? [];
  const blue = getTeamTotals(players, 0);
  const orange = getTeamTotals(players, 1);
  const possession = finalStats.possession ?? {};

  const W = 1400;
  const ROW_H = 66;
  const START_Y = 108;
  const BAR_X = 555;
  const BAR_W = 290;
  const BAR_H = 10;
  const BAR_Y_OFFSET = 30;

  const rows = [
    ["Goals",           blue.goals,               orange.goals,               (v) => formatNumber(v)],
    ["Shots",           blue.shots,               orange.shots,               (v) => formatNumber(v)],
    ["Assists",         blue.assists,             orange.assists,             (v) => formatNumber(v)],
    ["Saves",           blue.saves,               orange.saves,               (v) => formatNumber(v)],
    ["Shooting %",      blue.shootingPct,         orange.shootingPct,         (v) => `${formatNumber(v, 1)}%`],
    ["Possession",      possession.team0Pct ?? 0, possession.team1Pct ?? 0,   (v) => `${formatNumber(v, 1)}%`],
    ["Demos",           blue.demos,               orange.demos,               (v) => formatNumber(v)],
    ["BPM",             blue.bpm,                 orange.bpm,                 (v) => formatNumber(v, 1)],
    ["Boost Collected", blue.boostCollected,      orange.boostCollected,      (v) => formatNumber(v, 1)],
    ["Boost Stolen",    blue.boostStolen,         orange.boostStolen,         (v) => formatNumber(v)],
    ["Big Pads",        blue.bigPads,             orange.bigPads,             (v) => formatNumber(v)],
    ["Small Pads",      blue.smallPads,           orange.smallPads,           (v) => formatNumber(v)],
  ];

  const clipDefs = rows.map((_, i) => {
    const barY = START_Y + i * ROW_H + BAR_Y_OFFSET;
    return `<clipPath id="bar${i}"><rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="${BAR_H}" rx="5"/></clipPath>`;
  }).join("\n");

  const rowsSvg = rows.map(([label, blueVal, orangeVal, fmt], i) => {
    const bv = safeNumber(blueVal);
    const ov = safeNumber(orangeVal);
    const y = START_Y + i * ROW_H;
    const barY = y + BAR_Y_OFFSET;
    const blueWins = bv > ov;
    const orangeWins = ov > bv;
    const total = bv + ov;
    const blueBarW = total > 0 ? Math.round((bv / total) * BAR_W) : 0;
    const orangeBarW = total > 0 ? BAR_W - blueBarW : 0;
    const rowFill = i % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0)";

    const blueWinBadge = blueWins ? `
      <rect x="466" y="${y + 36}" width="44" height="20" rx="10" fill="${BLUE}22" stroke="${BLUE}44"/>
      <text x="488" y="${y + 50}" fill="${BLUE}" font-family="Inter, Segoe UI, Arial" font-size="12" font-weight="900" letter-spacing="1.5" text-anchor="middle">WIN</text>` : "";

    const orangeWinBadge = orangeWins ? `
      <rect x="890" y="${y + 36}" width="44" height="20" rx="10" fill="${ORANGE}22" stroke="${ORANGE}44"/>
      <text x="912" y="${y + 50}" fill="${ORANGE}" font-family="Inter, Segoe UI, Arial" font-size="12" font-weight="900" letter-spacing="1.5" text-anchor="middle">WIN</text>` : "";

    return `
      <rect x="60" y="${y}" width="${W - 120}" height="${ROW_H}" fill="${rowFill}"/>
      <line x1="60" y1="${y + ROW_H}" x2="${W - 60}" y2="${y + ROW_H}" stroke="rgba(255,255,255,0.055)"/>
      <text x="455" y="${y + 46}" fill="${blueWins ? TEXT : MUTED}" font-family="Inter, Segoe UI, Arial" font-size="30" font-weight="${blueWins ? 900 : 700}" text-anchor="end">${escapeXml(fmt(blueVal))}</text>
      ${blueWinBadge}
      <text x="${W / 2}" y="${y + 22}" fill="${MUTED}" font-family="Inter, Segoe UI, Arial" font-size="13" font-weight="800" letter-spacing="1.5" text-anchor="middle">${escapeXml(label.toUpperCase())}</text>
      <rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="${BAR_H}" rx="5" fill="rgba(255,255,255,0.07)"/>
      <g clip-path="url(#bar${i})">
        <rect x="${BAR_X}" y="${barY}" width="${blueBarW}" height="${BAR_H}" fill="${BLUE}"/>
        <rect x="${BAR_X + blueBarW}" y="${barY}" width="${orangeBarW}" height="${BAR_H}" fill="${ORANGE}"/>
      </g>
      ${orangeWinBadge}
      <text x="945" y="${y + 46}" fill="${orangeWins ? TEXT : MUTED}" font-family="Inter, Segoe UI, Arial" font-size="30" font-weight="${orangeWins ? 900 : 700}" text-anchor="start">${escapeXml(fmt(orangeVal))}</text>`;
  }).join("");

  const height = START_Y + rows.length * ROW_H + 48;

  const body = `
    <text x="${W / 2}" y="62" fill="${TEXT}" font-family="Inter, Segoe UI, Arial" font-size="19" font-weight="900" letter-spacing="3" text-anchor="middle">TEAM STATS</text>
    <circle cx="76" cy="56" r="10" fill="${BLUE}"/>
    <text x="98" y="65" fill="${BLUE}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="900">Blue</text>
    <circle cx="${W - 76}" cy="56" r="10" fill="${ORANGE}"/>
    <text x="${W - 98}" y="65" fill="${ORANGE}" font-family="Inter, Segoe UI, Arial" font-size="24" font-weight="900" text-anchor="end">Orange</text>
    <line x1="60" y1="86" x2="${W - 60}" y2="86" stroke="rgba(255,255,255,0.10)"/>
    ${rowsSvg}`;

  return cardShell(W, height, body, clipDefs);
}

async function writePng(filename, svg) {
  const outputPath = path.join(CARD_DIR, filename);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return { filename, path: outputPath };
}

export async function renderDiscordCards(finalStats, timeline) {
  await fs.mkdir(CARD_DIR, { recursive: true });

  const cards = [
    await writePng("match-summary.png", renderMatchSummarySvg(finalStats, timeline)),
    await writePng("scoreboard.png", renderScoreboardSvg(finalStats, timeline)),
    await writePng("team-comparison.png", renderTeamComparisonSvg(finalStats, timeline)),
  ];

  const manifest = {
    generatedAt: new Date().toISOString(),
    replayName: finalStats.replayName ?? null,
    cards,
  };

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  return manifest;
}

async function main() {
  const finalStats = JSON.parse(await fs.readFile(FINAL_STATS_PATH, "utf8"));
  let timeline = null;
  try {
    timeline = JSON.parse(await fs.readFile(TIMELINE_PATH, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const manifest = await renderDiscordCards(finalStats, timeline);

  console.log("\nDiscord cards generated:");
  console.table(manifest.cards.map((card) => ({ File: card.filename, Path: card.path })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Failed to render Discord cards:");
    console.error(error.message);
    process.exit(1);
  });
}
