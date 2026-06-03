import { MODE_OPTIONS, BALL_COLORS } from '@/features/ball/constants'
import { n } from '@/lib/formatters'
import { shortLabel } from '@/features/ball/lib/ballFormatters'

export function buildBallViewModel(data, mode) {
  const speedData = [
    { label: 'Slow', value: n(data?.speedBands?.slowPct), color: BALL_COLORS.cyan },
    { label: 'Medium', value: n(data?.speedBands?.mediumPct), color: BALL_COLORS.green },
    { label: 'Fast', value: n(data?.speedBands?.fastPct), color: BALL_COLORS.gold },
    { label: 'Supersonic', value: n(data?.speedBands?.supersonicBallPct), color: BALL_COLORS.red },
  ]

  const heightData = [
    { label: 'Ground', value: n(data?.heightBands?.groundPct), color: BALL_COLORS.green },
    { label: 'Low aerial', value: n(data?.heightBands?.lowAerialPct), color: BALL_COLORS.purple },
    { label: 'High aerial', value: n(data?.heightBands?.highAerialPct), color: BALL_COLORS.gold },
  ]

  const territoryData = [
    { label: 'Blue half', value: n(data?.territory?.blueHalfPct), color: BALL_COLORS.blue },
    { label: 'Midfield', value: n(data?.territory?.midfieldPct), color: BALL_COLORS.neutral },
    { label: 'Orange half', value: n(data?.territory?.orangeHalfPct), color: BALL_COLORS.orange },
  ]

  const thirdsData = [
    { label: 'Blue third', value: n(data?.territory?.blueThirdPct), color: BALL_COLORS.blue },
    { label: 'Middle third', value: n(data?.territory?.midfieldThirdPct), color: BALL_COLORS.purple },
    { label: 'Orange third', value: n(data?.territory?.orangeThirdPct), color: BALL_COLORS.orange },
  ]

  const possession = data?.possession ?? {}
  const bluePossession = n(possession.team0Pct)
  const orangePossession = n(possession.team1Pct)
  const possessionLeader = bluePossession >= orangePossession ? 'Blue' : 'Orange'
  const possessionLeaderPct = Math.max(bluePossession, orangePossession)

  return {
    speedData,
    heightData,
    territoryData,
    thirdsData,
    possession,
    bluePossession,
    orangePossession,
    possessionLeader,
    possessionLeaderPct,
    activeMode: MODE_OPTIONS.find((option) => option.key === mode) ?? MODE_OPTIONS[0],
    hasSamples: (data?.samples?.length ?? 0) > 0,
    pressureTimelineRows: (data?.pressureTimeline ?? []).map((bucket) => ({
      ...bucket,
      label: shortLabel(bucket.label),
    })),
  }
}
