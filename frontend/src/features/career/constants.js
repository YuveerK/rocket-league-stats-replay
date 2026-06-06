import { fmt, fmtPct } from '@/lib/formatters'

export const COMPARE_HEADER_GRADIENT =
  'radial-gradient(circle at 16% 0%, rgba(96,165,250,0.17), transparent 31%), ' +
  'radial-gradient(circle at 84% 8%, rgba(168,85,247,0.15), transparent 30%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#090d18 100%)'

export const PEER_HEADER_GRADIENT =
  'radial-gradient(circle at 14% 0%, rgba(52,211,153,0.15), transparent 31%), ' +
  'radial-gradient(circle at 86% 8%, rgba(244,63,94,0.13), transparent 30%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#090d18 100%)'

export const STAT_ROWS = [
  { label: 'Matches',       key: 'totalMatches',    format: (v) => fmt(v),          higher: 'better'  },
  { label: 'Win Rate',      key: 'winRate',          format: (v) => fmtPct(v),       higher: 'better'  },
  { label: 'Avg Score',     key: 'avgScore',         format: (v) => fmt(v, 1),       higher: 'better'  },
  { label: 'Goals / Game',  key: 'avgGoals',         format: (v) => fmt(v, 2),       higher: 'better'  },
  { label: 'Assists / Game',key: 'avgAssists',       format: (v) => fmt(v, 2),       higher: 'better'  },
  { label: 'Saves / Game',  key: 'avgSaves',         format: (v) => fmt(v, 2),       higher: 'better'  },
  { label: 'Shots / Game',  key: 'avgShots',         format: (v) => fmt(v, 2),       higher: 'better'  },
  { label: 'Shooting %',    key: 'avgShootingPct',   format: (v) => `${fmt(v, 1)}%`, higher: 'better'  },
  { label: 'Avg Boost',     key: 'avgBoost',         format: (v) => `${fmt(v, 1)}%`, higher: 'neutral' },
  { label: 'Supersonic %',  key: 'avgSupersonicPct', format: (v) => `${fmt(v, 1)}%`, higher: 'neutral' },
  { label: 'Airborne %',    key: 'avgAirbornePct',   format: (v) => `${fmt(v, 1)}%`, higher: 'neutral' },
  { label: 'BPM',           key: 'avgBpm',           format: (v) => fmt(v, 1),       higher: 'neutral' },
  { label: 'Total Demos',   key: 'totalKills',       format: (v) => fmt(v),          higher: 'better'  },
]
