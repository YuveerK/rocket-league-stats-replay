import { Crosshair } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { PURPLE } from '@/lib/colors'
import { PlayerPositionCard } from '@/features/positioning/components/PlayerPositionCard'

export function PlayerPositionProfilesPanel({ players }) {
  return (
    <Panel
      eyebrow="Roster"
      title="Player Position Profiles"
      subtitle="Zone split and defensive positioning per player"
      Icon={Crosshair}
      accent={PURPLE}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {players.map((player) => (
          <PlayerPositionCard key={player.playerName} player={player} />
        ))}
      </div>
    </Panel>
  )
}
