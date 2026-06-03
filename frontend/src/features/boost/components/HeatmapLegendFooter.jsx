import { MapPin } from 'lucide-react'
import { BLUE, ORANGE } from '@/lib/colors'

export function HeatmapLegendFooter({ meta }) {
  const isCanonical = meta?.padLocationMode === 'canonical-standard-soccar'

  return (
    <div className="mt-8 rounded-2xl border border-white/6 bg-white/2 px-5 py-4">
      <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/32">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-white/10 ring-1 ring-white/10" />
          Pad location — not visited
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: '#7c1f18' }} />
          Rarely visited
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: '#d93520' }} />
          Frequently visited
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: '#ff4520', boxShadow: '0 0 6px #ff4520' }} />
          Most visited
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white/10 text-[7px] font-black text-white/70 ring-1 ring-white/15">6</span>
          Number = pickup count at that fixed pad
        </span>
        <span className="flex items-center gap-2">
          <MapPin size={13} className="text-white/35" />
          {isCanonical ? 'Locations snapped to standard Soccar coordinates' : 'Locations estimated from pickup contact points'}
        </span>
        <span className="flex items-center gap-2 ml-auto">
          <span className="h-2 w-8 rounded-sm" style={{ background: `linear-gradient(90deg, ${BLUE}50, ${BLUE})` }} />
          Blue half
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-8 rounded-sm" style={{ background: `linear-gradient(90deg, ${ORANGE}, ${ORANGE}50)` }} />
          Orange half
        </span>
      </div>
    </div>
  )
}
