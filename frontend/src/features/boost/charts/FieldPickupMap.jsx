import {
  SV_W, SV_H, SV_PAD, SV_FW, SV_FH,
  BLUE_HALF, ORANGE_HALF, BLUE_OUTLINE, ORANGE_OUTLINE,
  CENTER_X, CENTER_Y, FIELD_LEFT_X, FIELD_RIGHT_X,
  BG_X1, BG_X2, BG_Y, OG_X1, OG_X2, OG_Y,
  CENTER_CIRCLE_R,
  toSvg, svgPts, heatColor,
} from '@/lib/fieldGeometry'
import { BLUE, ORANGE } from '@/lib/colors'

export function FieldPickupMap({ pads, maxCount, mapId }) {
  return (
    <svg
      viewBox={`0 0 ${SV_W} ${SV_H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`glow-${mapId}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x={SV_PAD} y={SV_PAD} width={SV_FW} height={SV_FH} fill="rgba(4,6,14,0.75)" rx="3" />

      <polygon points={svgPts(ORANGE_HALF)} fill={ORANGE} fillOpacity="0.025" />
      <polygon points={svgPts(BLUE_HALF)}   fill={BLUE}   fillOpacity="0.025" />

      <polyline points={svgPts(BLUE_OUTLINE)}   fill="none" stroke={BLUE}   strokeWidth="1.5" strokeOpacity="0.45" strokeLinejoin="miter" />
      <polyline points={svgPts(ORANGE_OUTLINE)} fill="none" stroke={ORANGE} strokeWidth="1.5" strokeOpacity="0.45" strokeLinejoin="miter" />

      <line x1={FIELD_LEFT_X} y1={CENTER_Y} x2={FIELD_RIGHT_X} y2={CENTER_Y}
        stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="6,4" />

      <circle cx={CENTER_X} cy={CENTER_Y} r={CENTER_CIRCLE_R}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="5,4" />

      <line x1={BG_X1} y1={BG_Y} x2={BG_X2} y2={BG_Y} stroke={BLUE}   strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
      <line x1={OG_X1} y1={OG_Y} x2={OG_X2} y2={OG_Y} stroke={ORANGE} strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />

      {pads.map(pad => {
        const [sx, sy] = toSvg(pad.x, pad.y)
        const heat  = heatColor(pad.count, maxCount)
        const isBig = pad.padType === 'big'
        const t     = maxCount > 0 ? Math.min(1, pad.count / maxCount) : 0
        const baseR = isBig ? 10 : 4
        const r     = heat ? baseR * (1 + 0.22 * t) : baseR * 0.88
        const glowing = heat && t > 0.4

        return (
          <g key={pad.id}>
            {glowing && (
              <circle cx={sx} cy={sy} r={r * 2.4} fill={heat.fill} fillOpacity={0.10 + 0.08 * t} />
            )}
            <circle
              cx={sx} cy={sy} r={r}
              fill={heat ? heat.fill : (isBig ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.06)')}
              fillOpacity={heat ? heat.op : 1}
              filter={glowing ? `url(#glow-${mapId})` : undefined}
            />
            {pad.count > 0 && (
              <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central"
                fontSize={isBig ? '6.5' : '5.2'} fontWeight="900" fill="rgba(255,255,255,0.92)"
                style={{ fontFamily: 'ui-monospace,monospace', userSelect: 'none', pointerEvents: 'none' }}>
                {pad.count}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
