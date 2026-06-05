import { prisma } from "../../lib/prisma.js";

export function normalizeArtifactKey(key) {
  return String(key).replace(/\\/g, "/");
}

export async function resolveReplay(replayId = null) {
  if (replayId) {
    return prisma.replay.findUnique({ where: { replayId } });
  }

  const active = await prisma.replay.findFirst({
    where: { activeAt: { not: null } },
    orderBy: { activeAt: "desc" },
  });
  if (active) return active;

  return prisma.replay.findFirst({
    where: { analyzedAt: { not: null } },
    orderBy: { analyzedAt: "desc" },
  });
}

export async function getReplayArtifactMap(keys, { replayId = null } = {}) {
  const replay = await resolveReplay(replayId);
  if (!replay) return { replay: null, artifacts: {} };

  const normalizedKeys = keys.map(normalizeArtifactKey);
  const rows = await prisma.replayAnalysisArtifact.findMany({
    where: {
      replayId: replay.replayId,
      key: { in: normalizedKeys },
    },
  });

  return {
    replay,
    artifacts: Object.fromEntries(rows.map((row) => [row.key, row.payload])),
  };
}

export async function readReplayArtifacts(keys, options = {}) {
  const { artifacts } = await getReplayArtifactMap(keys, options);
  return keys.map((key) => artifacts[normalizeArtifactKey(key)] ?? null);
}

export async function upsertReplayArtifacts(replayId, artifacts, client = prisma) {
  const now = new Date();
  for (const [rawKey, payload] of Object.entries(artifacts)) {
    if (payload == null) continue;
    const key = normalizeArtifactKey(rawKey);
    await client.replayAnalysisArtifact.upsert({
      where: { replayId_key: { replayId, key } },
      update: { payload, updatedAt: now },
      create: { replayId, key, payload, updatedAt: now },
    });
  }
}

export async function activateReplay(replayId) {
  return prisma.replay.update({
    where: { replayId },
    data: { activeAt: new Date() },
  });
}
