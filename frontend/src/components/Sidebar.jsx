import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Circle, Bomb,
  Rocket, MapPin, Crosshair, Map as MapIcon,
  Wind, Video, Camera, FileSpreadsheet, Trophy,
  FolderOpen, Users, GitCompareArrows, X,
} from 'lucide-react'

const NAV = [
  {
    section: 'STATS',
    items: [
      { to: '/',                 label: 'Overview',         icon: LayoutDashboard, end: true },
      { to: '/replays',          label: 'Replay Library',   icon: FolderOpen },
      { to: '/career',           label: 'Career Stats',     icon: Trophy, end: true },
      { to: '/career/compare',   label: 'Player Compare',   icon: GitCompareArrows },
      { to: '/career/peers',     label: 'Peer Breakdown',   icon: Users },
      { to: '/core',             label: 'Core',             icon: TrendingUp },
      { to: '/ball',             label: 'Ball',             icon: Circle },
      { to: '/demos',            label: 'Demos',            icon: Bomb },
    ],
  },
  {
    section: 'BOOST',
    items: [
      { to: '/boost/team',    label: 'Team',        icon: Rocket },
      { to: '/boost/players', label: 'Players',     icon: Rocket },
      { to: '/boost/pickups', label: 'Pickup maps', icon: MapPin },
    ],
  },
  {
    section: 'POSITIONING',
    items: [
      { to: '/positioning', label: 'Positioning', icon: Crosshair },
      { to: '/heatmaps',    label: 'Heatmaps',    icon: MapIcon },
    ],
  },
  {
    section: 'MOVEMENT',
    items: [
      { to: '/movement', label: 'Mechanics', icon: Wind },
    ],
  },
  {
    section: 'WATCH',
    items: [
      { to: '/watch', label: '3D Replay viewer', icon: Video },
    ],
  },
  {
    section: 'SETTINGS',
    items: [
      { to: '/settings', label: 'Camera & Settings', icon: Camera },
    ],
  },
  {
    section: 'EXPORT',
    items: [
      { to: '/export', label: 'CSV export', icon: FileSpreadsheet },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()

  // Close mobile nav whenever the route changes
  useEffect(() => {
    onClose?.()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 h-screen w-64 shrink-0 flex flex-col py-3 border-r overflow-hidden',
        'transition-transform duration-300 ease-in-out',
        'md:static md:z-auto md:w-56 md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{ background: '#080b14', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {/* Logo + mobile close button */}
      <div className="px-5 py-3 mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <Trophy size={12} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white/80 tracking-tight">Replay Parser</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/8 hover:text-white/70"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      <div className="h-px mx-4 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <nav className="min-h-0 flex-1 overflow-y-auto space-y-0.5 px-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 5rem)' }}>
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-[0.14em] uppercase"
              style={{ color: 'rgba(255,255,255,0.25)' }}>
              {section}
            </p>
            {items.map(({ to, label, icon: Icon, badge, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(90deg,rgba(59,130,246,0.18),rgba(99,102,241,0.10))',
                  borderLeft: '2px solid #3b82f6',
                  paddingLeft: '10px',
                } : {}}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{label}</span>
                {badge && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: '#14b8a6' }}>
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
