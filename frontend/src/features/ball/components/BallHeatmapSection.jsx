import { Crosshair } from 'lucide-react'
import BallHeatmap from '@/components/BallHeatmap'
import { Panel } from '@/components/ui/Panel'
import { MODE_OPTIONS } from '@/features/ball/constants'
import { TinyMetric } from '@/features/ball/components/TinyMetric'
import { ModeButton } from '@/features/ball/components/ModeButton'
import { fmt } from '@/lib/formatters'

export function BallHeatmapSection({ data, mode, model, onModeChange }) {
  return (
    <Panel
      eyebrow="Ball Heatmap"
      title={model.activeMode.label}
      subtitle="Density is clipped to the Rocket League field"
      Icon={Crosshair}
      accent={model.activeMode.color}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map((option) => (
            <ModeButton key={option.key} option={option} active={mode === option.key} onClick={() => onModeChange(option.key)} />
          ))}
        </div>

        {model.hasSamples ? (
          <BallHeatmap samples={data.samples} mode={mode} />
        ) : (
          <div className="flex min-h-105 items-center justify-center rounded-2xl border border-white/8 bg-white/3 text-sm text-white/35">
            No ball position timeline found. Run replay analysis again to generate ball-position-timeline.json.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TinyMetric
            label="Mode"
            value={model.activeMode.label}
            color={model.activeMode.color}
            subtitle={mode === 'pressure' ? 'Blue/orange pressure tint' : 'Neutral density heat'}
          />
          <TinyMetric label="Tracked Samples" value={fmt(data.sampleCount)} color="#38bdf8" subtitle="Replicated ball state updates" />
          <TinyMetric label="Data Source" value="RBState" color="#e5e7eb" subtitle="Ball position, speed and height" />
        </div>
      </div>
    </Panel>
  )
}
