import { Crosshair, MapPin, Navigation, Shield, Target } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { BLUE, GREEN, ORANGE, PURPLE } from '@/lib/colors'
import { fmt, fmtDuration, fmtPct, shortName } from '@/lib/formatters'
import { POSITIONING_HEADER_GRADIENT } from '@/features/positioning/constants'

export function PositioningHeader({ data, model }) {
  const { blue, orange } = model.teams
  const { closestPlayer, mostDefensive } = model

  return (
    <PageHeader
      gradient={POSITIONING_HEADER_GRADIENT}
      eyebrow="Spatial intelligence"
      EyebrowIcon={Crosshair}
      eyebrowColor="#93c5fd"
      title="Positioning Analytics"
      description="Field thirds, ball proximity, and defensive spacing - team-relative zones from car position samples."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <HeroMetric
          label="Closest to ball"
          value={closestPlayer ? shortName(closestPlayer.playerName, 12) : '-'}
          detail={closestPlayer ? `${fmt(closestPlayer.positioning?.avgDistanceToBallUU)} uu avg` : 'No samples'}
          color={GREEN}
          Icon={Target}
        />
        <HeroMetric
          label="Most defensive"
          value={mostDefensive ? shortName(mostDefensive.playerName, 12) : '-'}
          detail={mostDefensive ? `${fmtPct(mostDefensive.zones?.defPct)} in def third` : '-'}
          color={BLUE}
          Icon={Shield}
        />
        <HeroMetric
          label="Blue behind ball"
          value={blue.behindBallPct != null ? fmtPct(blue.behindBallPct) : '-'}
          detail="All samples"
          color={BLUE}
          Icon={Navigation}
        />
        <HeroMetric
          label="Orange behind ball"
          value={orange.behindBallPct != null ? fmtPct(orange.behindBallPct) : '-'}
          detail="All samples"
          color={ORANGE}
          Icon={Navigation}
        />
        <HeroMetric
          label="Match time"
          value={data?.matchDuration ? fmtDuration(data.matchDuration) : '-'}
          detail={data?.mapName ?? 'Replay'}
          color={PURPLE}
          Icon={MapPin}
        />
      </div>
    </PageHeader>
  )
}
