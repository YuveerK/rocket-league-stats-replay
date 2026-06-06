import { useState } from "react";
import ReplayPage from "@/components/layout/ReplayPage";
import { useBoostPickups } from "@/features/boost/hooks/useBoostPickups";
import { BoostPickupsHeader } from "@/features/boost/components/BoostPickupsHeader";
import { TeamHeatmapColumns } from "@/features/boost/components/TeamHeatmapColumns";
import { HeatmapLegendFooter } from "@/features/boost/components/HeatmapLegendFooter";

export default function BoostPickups() {
  const [filter, setFilter] = useState("all");
  const { status, meta, players, pads, metrics, analysis } = useBoostPickups();

  return (
    <ReplayPage status={status} analysis={analysis} error={null}>
      <div className="anim-fade-in">
        <BoostPickupsHeader
          meta={meta}
          metrics={metrics}
          filter={filter}
          onFilterChange={setFilter}
          onUpload={analysis.handleAnalysisStart}
        />
        <main className="mx-auto max-w-7xl px-8 py-8">
          <TeamHeatmapColumns players={players} pads={pads} filter={filter} />
          <HeatmapLegendFooter meta={meta} />
        </main>
      </div>
    </ReplayPage>
  );
}
