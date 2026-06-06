import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import Overview from '@/pages/Overview'
import Heatmaps from '@/pages/Heatmaps'
import Core from '@/pages/Core'
import Ball from '@/pages/Ball'
import Demos from '@/pages/Demos'
import BoostTeam from '@/pages/BoostTeam'
import BoostPlayers from '@/pages/BoostPlayers'
import BoostPickups from '@/pages/BoostPickups'
import ReplayLibrary from '@/pages/ReplayLibrary'
import Movement from '@/pages/Movement'
import Watch from '@/pages/Watch'
import CareerStats from '@/pages/CareerStats'
import Positioning from '@/pages/Positioning'
import PeerBreakdown from '@/pages/PeerBreakdown'
import PlayerCompare from '@/pages/PlayerCompare'

const PLACEHOLDER = ({ title }) => (
  <div className="flex items-center justify-center min-h-screen text-white/20 text-sm">{title} coming soon</div>
)

export default function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: '#05070f' }}>
        {/* Mobile backdrop */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {/* Mobile topbar */}
          <header
            className="flex shrink-0 items-center gap-3 border-b px-4 py-3 md:hidden"
            style={{ background: '#080b14', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition hover:text-white/90"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-sm text-white/80 tracking-tight">Replay Parser</span>
          </header>

          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 5rem)' }}>
            <Routes>
              <Route path="/"               element={<Overview />} />
              <Route path="/replays"        element={<ReplayLibrary />} />
              <Route path="/heatmaps"       element={<Heatmaps />} />
              <Route path="/core"           element={<Core />} />
              <Route path="/ball"           element={<Ball />} />
              <Route path="/demos"          element={<Demos />} />
              <Route path="/boost/team"     element={<BoostTeam />} />
              <Route path="/boost/players"  element={<BoostPlayers />} />
              <Route path="/boost/pickups"  element={<BoostPickups />} />
              <Route path="/positioning"    element={<Positioning />} />
              <Route path="/movement"       element={<Movement />} />
              <Route path="/watch"          element={<Watch />} />
              <Route path="/career"         element={<CareerStats />} />
              <Route path="/career/compare" element={<PlayerCompare />} />
              <Route path="/career/peers"   element={<PeerBreakdown />} />
              <Route path="/settings"       element={<PLACEHOLDER title="Camera & Settings" />} />
              <Route path="/export"         element={<PLACEHOLDER title="CSV Export" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
