import {
  Activity,
  GitCompareArrows,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { HeroMetric } from "@/components/ui/HeroMetric";
import { BLUE, GOLD, GREEN, PURPLE, RED } from "@/lib/colors";
import { fmt, fmtPct, shortName } from "@/lib/formatters";
import { usePlayerCompare } from "@/features/career/hooks/usePlayerCompare";
import { COMPARE_HEADER_GRADIENT } from "@/features/career/constants";
import { ComparePicker } from "@/features/career/components/ComparePicker";
import { CareerEmptyState } from "@/features/career/components/CareerEmptyState";
import { ComparePlayerCard } from "@/features/career/components/ComparePlayerCard";
import { StatDuelTable } from "@/features/career/components/StatDuelTable";
import { SharedSummary } from "@/features/career/components/SharedSummary";
import { SharedScoreChart } from "@/features/career/charts/SharedScoreChart";
import { MapCompare } from "@/features/career/components/MapCompare";
import { OverlapTable } from "@/features/career/components/OverlapTable";
import { SharedMatchesTable } from "@/features/career/components/SharedMatchesTable";

export default function PlayerCompare() {
  const {
    players,
    playerA,
    setPlayerA,
    playerB,
    setPlayerB,
    activeCompare,
    commonMaps,
    commonTeammates,
    commonOpponents,
    sharedMatches,
    isLoading,
    needsSecondPlayer,
    samePlayer,
    error,
  } = usePlayerCompare();

  return (
    <div className="anim-fade-in">
      <PageHeader
        gradient={COMPARE_HEADER_GRADIENT}
        eyebrow="Player comparison lab"
        EyebrowIcon={GitCompareArrows}
        eyebrowColor={PURPLE}
        title="Player Compare"
        description="Compare two indexed players across career stats, shared matches, map splits and roster overlap."
      >
        <ComparePicker
          players={players}
          playerA={playerA}
          playerB={playerB}
          onPlayerA={setPlayerA}
          onPlayerB={setPlayerB}
          totalShared={activeCompare?.summary?.sharedMatches ?? 0}
        />

        {activeCompare && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HeroMetric
              label="Shared Matches"
              value={fmt(activeCompare.summary.sharedMatches)}
              detail={`${fmt(activeCompare.summary.sameTeamMatches)} with, ${fmt(activeCompare.summary.oppositeTeamMatches)} against`}
              color={BLUE}
              Icon={Activity}
            />
            <HeroMetric
              label="Together W%"
              value={fmtPct(activeCompare.summary.togetherWinRate)}
              detail={`${fmt(activeCompare.summary.winsTogether)} wins as teammates`}
              color={GREEN}
              Icon={ShieldCheck}
            />
            <HeroMetric
              label={`${shortName(playerA, 9)} vs ${shortName(playerB, 9)}`}
              value={`${fmt(activeCompare.summary.playerAWinsVsB)}-${fmt(activeCompare.summary.playerBWinsVsA)}`}
              detail={`${fmt(activeCompare.summary.drawsVs)} draws head-to-head`}
              color={RED}
              Icon={Swords}
            />
            <HeroMetric
              label="Common Maps"
              value={fmt(commonMaps.length)}
              detail="union of career map samples"
              color={PURPLE}
              Icon={MapIcon}
            />
            <HeroMetric
              label="Peer Overlap"
              value={fmt(commonTeammates.length + commonOpponents.length)}
              detail={`${fmt(commonTeammates.length)} teammates, ${fmt(commonOpponents.length)} opponents`}
              color={GOLD}
              Icon={Users}
            />
          </div>
        )}
      </PageHeader>

      {isLoading && (
        <CareerEmptyState
          Icon={GitCompareArrows}
          title="Loading player comparison"
          detail="Building career, shared-match, map and roster overlap splits..."
          tone={BLUE}
        />
      )}
      {!isLoading && needsSecondPlayer && (
        <CareerEmptyState
          Icon={GitCompareArrows}
          title="Need two players"
          detail="Import replays with at least two non-bot players to use Player Compare."
          tone={GOLD}
        />
      )}
      {!isLoading && samePlayer && (
        <CareerEmptyState
          Icon={GitCompareArrows}
          title="Choose two different players"
          detail="Player Compare needs two distinct player profiles."
          tone={GOLD}
        />
      )}
      {!isLoading && error && !samePlayer && (
        <CareerEmptyState
          Icon={GitCompareArrows}
          title="Comparison unavailable"
          detail={error}
          tone={RED}
        />
      )}

      {activeCompare && !isLoading && !error && !samePlayer && (
        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ComparePlayerCard
              player={activeCompare.playerA}
              color={BLUE}
              side="Player A"
            />
            <ComparePlayerCard
              player={activeCompare.playerB}
              color={PURPLE}
              side="Player B"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <SharedSummary data={activeCompare} />
            <SharedScoreChart data={activeCompare} />
          </div>

          <StatDuelTable
            playerA={activeCompare.playerA}
            playerB={activeCompare.playerB}
          />

          <MapCompare rows={commonMaps} playerA={playerA} playerB={playerB} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <OverlapTable
              title="Common teammate overlap"
              rows={commonTeammates}
              relation="Common teammates"
              playerA={playerA}
              playerB={playerB}
              accent={GREEN}
            />
            <OverlapTable
              title="Common opponent overlap"
              rows={commonOpponents}
              relation="Common opponents"
              playerA={playerA}
              playerB={playerB}
              accent={RED}
            />
          </div>

          <SharedMatchesTable
            matches={sharedMatches}
            playerA={playerA}
            playerB={playerB}
          />
        </main>
      )}
    </div>
  );
}
