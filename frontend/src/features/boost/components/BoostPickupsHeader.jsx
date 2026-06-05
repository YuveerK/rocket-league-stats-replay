import { BatteryCharging, Database, Gauge, Layers, MapPin, ShieldAlert, Upload, Zap } from 'lucide-react'
import { fmt, shortName } from '@/lib/formatters'
import { BLUE, ORANGE } from '@/lib/colors'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { PageHeader } from '@/components/layout/PageHeader'

const HEADER_GRADIENT =
  'radial-gradient(circle at 18% 0%, rgba(96,165,250,0.22), transparent 30%), ' +
  'radial-gradient(circle at 78% 4%, rgba(251,146,60,0.14), transparent 32%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 60%,#090d18 100%)'

const FILTERS = [
  { value: 'all',   label: 'All Pads' },
  { value: 'big',   label: 'Big Pads' },
  { value: 'small', label: 'Small Pads' },
]

export function BoostPickupsHeader({ meta, metrics, filter, onFilterChange, onUpload }) {
  const { totalEvents, totalBig, totalSmall, totalStolen, topCollector, topStealer } = metrics

  return (
    <PageHeader
      gradient={HEADER_GRADIENT}
      eyebrow="Pickup location density per player"
      EyebrowIcon={MapPin}
      eyebrowColor="#93c5fd"
      title="Boost Pickup Heatmaps"
      description="Every boost pad visit mapped per player — hot pads reveal farming patterns and cross-field steals."
      onUpload={onUpload}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <HeroMetric label="Pickup Events"  value={fmt(totalEvents)}                        detail="Total across all players"          color={BLUE}                       Icon={Database}        />
        <HeroMetric label="Big Pads"       value={fmt(totalBig)}                           detail="Large boost pad pickups (count)"   color={BLUE}                       Icon={BatteryCharging} />
        <HeroMetric label="Small Pads"     value={fmt(totalSmall)}                         detail="Small boost pad pickups (count)" color={ORANGE}                     Icon={Layers}          />
        <HeroMetric label="Stolen"         value={fmt(totalStolen)}                        detail="Enemy-side pickups"                color={ORANGE}                     Icon={ShieldAlert}     />
        <HeroMetric label="Top Collector"  value={shortName(topCollector?.playerName, 12)} detail={`${fmt(topCollector?.pickups)} total pickups`} color={topCollector?.color ?? BLUE}  Icon={Gauge} />
        <HeroMetric label="Top Stealer"    value={shortName(topStealer?.playerName, 12)}   detail={`${fmt(topStealer?.boostStolen)} stolen pads`} color={topStealer?.color ?? ORANGE}  Icon={Zap}   />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => onFilterChange(f.value)}
              className={[
                'rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all',
                filter === f.value
                  ? 'border-blue-400/40 bg-blue-400/10 text-blue-300'
                  : 'border-white/10 bg-white/4 text-white/38 hover:border-white/20 hover:text-white/65',
              ].join(' ')}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-white/30">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/4 px-2.5 py-1">
            <Layers size={12} /> {meta?.replayName ?? 'Replay'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/4 px-2.5 py-1">
            <Upload size={12} /> {meta?.mapName ?? 'Unknown map'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/4 px-2.5 py-1">
            <MapPin size={12} /> {meta?.padLocationMode === 'canonical-standard-soccar' ? 'Canonical pad layout' : 'Estimated pad positions'}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">None</span>
          <div className="flex h-2 w-28 overflow-hidden rounded-full">
            {['rgba(255,255,255,0.10)', '#7c1f18', '#b02820', '#d93520', '#ff4520'].map((c, i) => (
              <div key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Hot</span>
        </div>
      </div>
    </PageHeader>
  )
}
