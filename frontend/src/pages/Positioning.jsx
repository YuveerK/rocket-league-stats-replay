import ReplayPage from "@/components/layout/ReplayPage";
import { PlayerDistancePanel } from "@/features/positioning/components/PlayerDistancePanel";
import { PlayerPositionProfilesPanel } from "@/features/positioning/components/PlayerPositionProfilesPanel";
import { PositioningHeader } from "@/features/positioning/components/PositioningHeader";
import { TeamBallProximityPanel } from "@/features/positioning/components/TeamBallProximityPanel";
import { TeamFieldControlPanel } from "@/features/positioning/components/TeamFieldControlPanel";
import { usePositioningAnalytics } from "@/features/positioning/hooks/usePositioningAnalytics";

export default function Positioning() {
  const { data, error, status, model } = usePositioningAnalytics();

  if (status !== "ready") {
    return <ReplayPage status={status} error={error} />;
  }

  return (
    <ReplayPage status={status} error={error}>
      <div className="anim-fade-in">
        <PositioningHeader
          data={data}
          model={model}
        />

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <TeamFieldControlPanel rows={model.zoneRows} />
            <TeamBallProximityPanel rows={model.spacingRows} />
          </section>

          <PlayerDistancePanel rows={model.distanceRows} />
          <PlayerPositionProfilesPanel players={model.players} />
        </main>
      </div>
    </ReplayPage>
  );
}
