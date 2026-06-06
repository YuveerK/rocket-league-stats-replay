import {
  Activity,
  Crosshair,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { BLUE, GOLD, GREEN, PURPLE, RED } from '@/lib/colors'
import { fmt, fmtPct, shortName } from '@/lib/formatters'
import { usePeerBreakdown } from '@/features/career/hooks/usePeerBreakdown'
import { PEER_HEADER_GRADIENT } from '@/features/career/constants'
import { CareerEmptyState } from '@/features/career/components/CareerEmptyState'
import { PeerPlayerSelector } from '@/features/career/components/PeerPlayerSelector'
import { PeerSpotlight } from '@/features/career/components/PeerSpotlight'
import { PeerTable } from '@/features/career/components/PeerTable'

export default function PeerBreakdown() {
  const {
    players, selected, setSelected, selectedPlayer,
    summary, teammates, opponents, teammateGames, opponentGames,
    isLoading, error,
  } = usePeerBreakdown()

  return (
    <div className="anim-fade-in">
      <PageHeader
        gradient={PEER_HEADER_GRADIENT}
        eyebrow="Roster relationship matrix"
        EyebrowIcon={Users}
        eyebrowColor={GREEN}
        title="Opponent & Teammate Breakdown"
        description="See who appears with you most often, who you beat most often, and how your own stats shift with each teammate."
      >
        <PeerPlayerSelector
          players={players}
          selected={selected}
          selectedPlayer={selectedPlayer}
          onSelect={setSelected}
          totalMatches={summary?.totalMatches ?? 0}
        />

        {summary && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HeroMetric label="Matches"          value={fmt(summary.totalMatches)}                                            detail="selected player sample"                                                                                                 color={BLUE}   Icon={Activity}   />
            <HeroMetric label="Teammates"        value={fmt(summary.uniqueTeammates)}                                         detail={`${fmt(teammateGames)} teammate pairings`}                                                                             color={GREEN}  Icon={ShieldCheck} />
            <HeroMetric label="Opponents"        value={fmt(summary.uniqueOpponents)}                                         detail={`${fmt(opponentGames)} opponent pairings`}                                                                             color={RED}    Icon={Swords}     />
            <HeroMetric label="Best Teammate"    value={summary.bestTeammate ? shortName(summary.bestTeammate.playerName, 12) : 'N/A'}     detail={summary.bestTeammate ? `${fmtPct(summary.bestTeammate.winRate)} across ${fmt(summary.bestTeammate.matches)}` : 'No teammate samples'}      color={GOLD}   Icon={Trophy}     />
            <HeroMetric label="Toughest Opp."   value={summary.toughestOpponent ? shortName(summary.toughestOpponent.playerName, 12) : 'N/A'} detail={summary.toughestOpponent ? `${fmtPct(summary.toughestOpponent.winRate)} win rate against` : 'No opponent samples'} color={PURPLE} Icon={Crosshair}  />
          </div>
        )}
      </PageHeader>

      {isLoading && <CareerEmptyState Icon={Users} title="Loading relationship breakdown" detail="Aggregating same-team and opposite-team samples from indexed replays..." tone={BLUE} />}
      {!isLoading && error && <CareerEmptyState Icon={Users} title="Relationship data unavailable" detail={error} tone={RED} />}
      {!isLoading && !error && !summary && <CareerEmptyState Icon={Users} title="No peer data yet" detail="Import multi-player replays to populate teammate and opponent splits." tone={GOLD} />}

      {summary && !isLoading && !error && (
        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <PeerSpotlight title="Most played with"    peer={summary.mostPlayedWith}    icon={ShieldCheck} color={GREEN}  fallback="No teammate" />
            <PeerSpotlight title="Most played against" peer={summary.mostPlayedAgainst} icon={Swords}      color={RED}    fallback="No opponent" />
            <PeerSpotlight title="Best teammate"       peer={summary.bestTeammate}      icon={Trophy}      color={GOLD}   fallback="No teammate" />
            <PeerSpotlight title="Toughest opponent"   peer={summary.toughestOpponent}  icon={Target}      color={PURPLE} fallback="No opponent" />
          </div>

          <PeerTable
            title="Your stats with each teammate"
            rows={teammates}
            relation="teammate"
            accent={GREEN}
            subtitle="Averages are your stats in games where that player was on your team"
          />

          <PeerTable
            title="Your record against each opponent"
            rows={opponents}
            relation="opponent"
            accent={RED}
            subtitle="Win rate is from the selected player's perspective"
          />
        </main>
      )}
    </div>
  )
}
