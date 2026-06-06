import { Activity, BarChart3, Clock, Upload } from "lucide-react";
import CoreAnalytics from "@/components/CoreAnalytics";
import { PageHeader } from "@/components/layout/PageHeader";
import ReplayPage from "@/components/layout/ReplayPage";
import { HeroMetric } from "@/components/ui/HeroMetric";
import { usePageData } from "@/hooks/usePageData";
import { formatDuration } from "@/lib/formatters";

const CORE_HEADER_GRADIENT =
  "radial-gradient(circle at 18% 0%, rgba(96,165,250,0.20), transparent 32%), " +
  "radial-gradient(circle at 82% 0%, rgba(251,146,60,0.18), transparent 30%), " +
  "linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)";

export default function Core() {
  const { data, loading, error } = usePageData("/api/overview");

  const status = loading ? "loading" : error || !data ? "empty" : "ready";

  const blueGoals = data?.match?.scoreTeam0 ?? 0;
  const orangeGoals = data?.match?.scoreTeam1 ?? 0;
  const totalShots =
    (data?.teams?.[0]?.shots ?? 0) + (data?.teams?.[1]?.shots ?? 0);
  const totalDemos =
    (data?.teams?.[0]?.demosInflicted ?? 0) +
    (data?.teams?.[1]?.demosInflicted ?? 0);

  return (
    <ReplayPage status={status} error={error}>
      {data && (
        <div className="anim-fade-in">
          <PageHeader
            gradient={CORE_HEADER_GRADIENT}
            eyebrow="Core performance intelligence"
            EyebrowIcon={Activity}
            eyebrowColor="#34d399"
            title="Core Stats Command Center"
            description="High-signal team and player graphs for scoring pressure, conversion, defensive context and demos."
            >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <HeroMetric
                label="Final Score"
                value={`${blueGoals} - ${orangeGoals}`}
                color="#94a3b8"
                Icon={BarChart3}
              />
              <HeroMetric
                label="Total Shots"
                value={totalShots}
                color="#38bdf8"
              />
              <HeroMetric
                label="Total Demos"
                value={totalDemos}
                color="#f43f5e"
              />
              <HeroMetric
                label="Match Time"
                value={formatDuration(data?.match?.totalSecondsPlayed)}
                color="#a78bfa"
                Icon={Clock}
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-white/60">
              <span className="glass-chip">
                <BarChart3 size={12} /> {data?.match?.replayName ?? "Replay"}
              </span>
              <span className="glass-chip">
                <Clock size={12} />{" "}
                {formatDuration(data?.match?.totalSecondsPlayed)}
              </span>
              <span className="glass-chip">
                <Upload size={12} /> Replay-backed analytics
              </span>
            </div>
          </PageHeader>

          <main className="mx-auto max-w-7xl px-8 py-8">
            <CoreAnalytics players={data.players} teams={data.teams} />
          </main>
        </div>
      )}
    </ReplayPage>
  );
}
