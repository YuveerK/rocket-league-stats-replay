import ReplayPage from "@/components/layout/ReplayPage";
import { useBallAnalytics } from "@/features/ball/hooks/useBallAnalytics";
import { BallHeader } from "@/features/ball/components/BallHeader";
import { BallHeatmapSection } from "@/features/ball/components/BallHeatmapSection";
import { BallProfilePanel } from "@/features/ball/components/BallProfilePanel";
import { PressurePanel } from "@/features/ball/components/PressurePanel";
import { TerritoryPanel } from "@/features/ball/components/TerritoryPanel";
import { BallBandPanels } from "@/features/ball/components/BallBandPanels";
import { MomentumTimelinePanel } from "@/features/ball/components/MomentumTimelinePanel";

export default function Ball() {
  const { data, error, status, mode, setMode, model } =
    useBallAnalytics();

  if (status !== "ready") {
    return <ReplayPage status={status} error={error} />;
  }

  return (
    <ReplayPage status={status} error={error}>
      <div className="anim-fade-in">
        <BallHeader
          data={data}
          model={model}
        />

        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_0.85fr]">
            <BallHeatmapSection
              data={data}
              mode={mode}
              model={model}
              onModeChange={setMode}
            />
            <BallProfilePanel data={data} model={model} />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <PressurePanel pressure={data.pressure} />
            <TerritoryPanel
              territoryData={model.territoryData}
              thirdsData={model.thirdsData}
            />
          </section>

          <BallBandPanels
            speedData={model.speedData}
            heightData={model.heightData}
          />
          <MomentumTimelinePanel rows={model.pressureTimelineRows} />
        </main>
      </div>
    </ReplayPage>
  );
}
