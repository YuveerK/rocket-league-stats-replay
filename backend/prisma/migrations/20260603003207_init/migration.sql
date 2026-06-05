-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "playerName" TEXT NOT NULL,
    "platform" TEXT,
    "onlineId" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replays" (
    "replayId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "replayName" TEXT,
    "mapName" TEXT NOT NULL,
    "matchType" TEXT,
    "teamSize" INTEGER NOT NULL,
    "unfairTeamSize" BOOLEAN NOT NULL DEFAULT false,
    "serverRegion" TEXT,
    "playlist" INTEGER,
    "overtime" BOOLEAN NOT NULL DEFAULT false,
    "forfeit" BOOLEAN NOT NULL DEFAULT false,
    "totalSecondsPlayed" DOUBLE PRECISION,
    "matchStartEpoch" BIGINT,
    "date" TEXT,
    "recorderName" TEXT,
    "winningTeam" INTEGER,
    "team0Score" INTEGER NOT NULL DEFAULT 0,
    "team1Score" INTEGER NOT NULL DEFAULT 0,
    "fileSizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3),
    "analyzedAt" TIMESTAMP(3),
    "activeAt" TIMESTAMP(3),

    CONSTRAINT "replays_pkey" PRIMARY KEY ("replayId")
);

-- CreateTable
CREATE TABLE "replay_analysis_artifacts" (
    "id" SERIAL NOT NULL,
    "replayId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replay_analysis_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "replayId" TEXT NOT NULL,
    "team" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "shots" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "shootingPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "boostUsed" DOUBLE PRECISION,
    "bpm" DOUBLE PRECISION,
    "averageBoost" DOUBLE PRECISION,
    "boostCollectedApprox" DOUBLE PRECISION,
    "zeroBoostSeconds" DOUBLE PRECISION,
    "fullBoostSeconds" DOUBLE PRECISION,
    "boost0To25Seconds" DOUBLE PRECISION,
    "boost25To50Seconds" DOUBLE PRECISION,
    "boost50To75Seconds" DOUBLE PRECISION,
    "boost75To100Seconds" DOUBLE PRECISION,
    "boost0To25Pct" DOUBLE PRECISION,
    "boost25To50Pct" DOUBLE PRECISION,
    "boost50To75Pct" DOUBLE PRECISION,
    "boost75To100Pct" DOUBLE PRECISION,
    "boostUsedWhileSupersonic" DOUBLE PRECISION,
    "pickups" INTEGER NOT NULL DEFAULT 0,
    "bigPads" INTEGER NOT NULL DEFAULT 0,
    "smallPads" INTEGER NOT NULL DEFAULT 0,
    "unknownPads" INTEGER NOT NULL DEFAULT 0,
    "boostStolen" INTEGER NOT NULL DEFAULT 0,
    "actualPickupGain" DOUBLE PRECISION,
    "theoreticalPickupEstimate" DOUBLE PRECISION,
    "maxSpeedUU" DOUBLE PRECISION,
    "avgSpeedUU" DOUBLE PRECISION,
    "supersonicSeconds" DOUBLE PRECISION,
    "supersonicPct" DOUBLE PRECISION,
    "airborneSeconds" DOUBLE PRECISION,
    "airbornePct" DOUBLE PRECISION,
    "avgThrottle" DOUBLE PRECISION,
    "handbrakeUsagePct" DOUBLE PRECISION,
    "airRolls" INTEGER,
    "dodgeCount" INTEGER,
    "doubleJumps" INTEGER,
    "dodgesRefreshed" INTEGER,
    "avgSteerDeviation" DOUBLE PRECISION,
    "avgPing" DOUBLE PRECISION,
    "maxPing" INTEGER,
    "worstNetQuality" INTEGER,
    "titleId" INTEGER,
    "totalGameTimePlayed" INTEGER,
    "priActorId" INTEGER,
    "partyLeaderId" TEXT,

    CONSTRAINT "match_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camera_settings" (
    "id" SERIAL NOT NULL,
    "matchPlayerId" INTEGER NOT NULL,
    "fov" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "angle" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "stiffness" DOUBLE PRECISION,
    "swivel" DOUBLE PRECISION,

    CONSTRAINT "camera_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loadouts" (
    "id" SERIAL NOT NULL,
    "matchPlayerId" INTEGER NOT NULL,
    "body" INTEGER,
    "decal" INTEGER,
    "wheels" INTEGER,
    "rocketTrail" INTEGER,
    "antenna" INTEGER,
    "topper" INTEGER,
    "goalExplosion" INTEGER,
    "onlineLoadout" JSONB,

    CONSTRAINT "loadouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ball_stats" (
    "id" SERIAL NOT NULL,
    "replayId" TEXT NOT NULL,
    "team0PossessionSeconds" DOUBLE PRECISION,
    "team1PossessionSeconds" DOUBLE PRECISION,
    "team0PossessionPct" DOUBLE PRECISION,
    "team1PossessionPct" DOUBLE PRECISION,
    "maxSpeedUU" DOUBLE PRECISION,
    "avgSpeedUU" DOUBLE PRECISION,
    "speedSampleCount" INTEGER,
    "aerialSamples" INTEGER,
    "totalSamples" INTEGER,
    "aerialPct" DOUBLE PRECISION,

    CONSTRAINT "ball_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" SERIAL NOT NULL,
    "replayId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frameIndex" INTEGER NOT NULL,
    "replayTimeSeconds" DOUBLE PRECISION NOT NULL,
    "elapsedSeconds" DOUBLE PRECISION,
    "elapsedClock" TEXT,
    "gameSecondsRemaining" INTEGER,
    "gameClockElapsed" TEXT,
    "gameClockElapsedSeconds" INTEGER,
    "source" TEXT,
    "playerName" TEXT NOT NULL,
    "playerId" INTEGER,
    "team" INTEGER,
    "counterValue" INTEGER,
    "victimPlayerName" TEXT,
    "victimPlayerId" INTEGER,
    "victimTeam" INTEGER,
    "killerPlayerName" TEXT,
    "scoreAfterTeam0" INTEGER,
    "scoreAfterTeam1" INTEGER,
    "timelineElapsedSeconds" DOUBLE PRECISION,

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "highlights" (
    "id" SERIAL NOT NULL,
    "replayId" TEXT NOT NULL,
    "frame" INTEGER,
    "carName" TEXT,
    "ballName" TEXT,
    "goalActorName" TEXT,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_pickups" (
    "id" SERIAL NOT NULL,
    "matchPlayerId" INTEGER NOT NULL,
    "replayId" TEXT NOT NULL,
    "frameIndex" INTEGER NOT NULL,
    "time" DOUBLE PRECISION NOT NULL,
    "padType" TEXT NOT NULL,
    "isStolen" BOOLEAN NOT NULL DEFAULT false,
    "estimatedBoostGain" DOUBLE PRECISION,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "z" DOUBLE PRECISION,

    CONSTRAINT "boost_pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_position_samples" (
    "id" SERIAL NOT NULL,
    "matchPlayerId" INTEGER NOT NULL,
    "replayId" TEXT NOT NULL,
    "frameIndex" INTEGER NOT NULL,
    "time" DOUBLE PRECISION NOT NULL,
    "elapsedSeconds" DOUBLE PRECISION,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "qx" DOUBLE PRECISION,
    "qy" DOUBLE PRECISION,
    "qz" DOUBLE PRECISION,
    "qw" DOUBLE PRECISION,
    "vx" DOUBLE PRECISION,
    "vy" DOUBLE PRECISION,
    "vz" DOUBLE PRECISION,
    "boostAmount" DOUBLE PRECISION,
    "throttle" DOUBLE PRECISION,

    CONSTRAINT "player_position_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heatmaps" (
    "id" SERIAL NOT NULL,
    "replayId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "team" INTEGER,
    "priActorId" INTEGER,
    "sampleCount" INTEGER,
    "inBoundsCount" INTEGER,
    "skippedCount" INTEGER,
    "filename" TEXT,
    "filePath" TEXT,

    CONSTRAINT "heatmaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_playerName_key" ON "players"("playerName");

-- CreateIndex
CREATE INDEX "replay_analysis_artifacts_key_idx" ON "replay_analysis_artifacts"("key");

-- CreateIndex
CREATE UNIQUE INDEX "replay_analysis_artifacts_replayId_key_key" ON "replay_analysis_artifacts"("replayId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "match_players_replayId_playerId_key" ON "match_players"("replayId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "camera_settings_matchPlayerId_key" ON "camera_settings"("matchPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "loadouts_matchPlayerId_key" ON "loadouts"("matchPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "ball_stats_replayId_key" ON "ball_stats"("replayId");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_events_replayId_eventId_key" ON "timeline_events"("replayId", "eventId");

-- CreateIndex
CREATE INDEX "boost_pickups_replayId_idx" ON "boost_pickups"("replayId");

-- CreateIndex
CREATE INDEX "boost_pickups_matchPlayerId_idx" ON "boost_pickups"("matchPlayerId");

-- CreateIndex
CREATE INDEX "player_position_samples_matchPlayerId_idx" ON "player_position_samples"("matchPlayerId");

-- CreateIndex
CREATE INDEX "player_position_samples_replayId_idx" ON "player_position_samples"("replayId");

-- CreateIndex
CREATE UNIQUE INDEX "heatmaps_replayId_playerName_key" ON "heatmaps"("replayId", "playerName");

-- AddForeignKey
ALTER TABLE "replay_analysis_artifacts" ADD CONSTRAINT "replay_analysis_artifacts_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "replays"("replayId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "replays"("replayId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "camera_settings" ADD CONSTRAINT "camera_settings_matchPlayerId_fkey" FOREIGN KEY ("matchPlayerId") REFERENCES "match_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loadouts" ADD CONSTRAINT "loadouts_matchPlayerId_fkey" FOREIGN KEY ("matchPlayerId") REFERENCES "match_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ball_stats" ADD CONSTRAINT "ball_stats_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "replays"("replayId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "replays"("replayId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_victimPlayerId_fkey" FOREIGN KEY ("victimPlayerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "replays"("replayId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_pickups" ADD CONSTRAINT "boost_pickups_matchPlayerId_fkey" FOREIGN KEY ("matchPlayerId") REFERENCES "match_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_position_samples" ADD CONSTRAINT "player_position_samples_matchPlayerId_fkey" FOREIGN KEY ("matchPlayerId") REFERENCES "match_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heatmaps" ADD CONSTRAINT "heatmaps_replayId_fkey" FOREIGN KEY ("replayId") REFERENCES "replays"("replayId") ON DELETE CASCADE ON UPDATE CASCADE;
