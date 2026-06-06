import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BatteryCharging,
  Clock,
  Database,
  Gauge,
  Layers,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { HeroMetric } from "@/components/ui/HeroMetric";
import { Panel } from "@/components/ui/Panel";
import { MeasuredChart } from "@/components/ui/MeasuredChart";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { PageHeader } from "@/components/layout/PageHeader";
import ReplayPage from "@/components/layout/ReplayPage";
import { usePageData } from "@/hooks/usePageData";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";
import { n, fmt, fmtPct, fmtSeconds, shortName } from "@/lib/formatters";
import { BLUE, ORANGE, GREEN, GOLD, RED, PURPLE } from "@/lib/colors";

const HEADER_GRADIENT =
  "radial-gradient(circle at 17% 0%, rgba(96,165,250,0.20), transparent 31%), " +
  "radial-gradient(circle at 84% 0%, rgba(52,211,153,0.14), transparent 32%), " +
  "linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)";

const EMPTY_TEAM = {};

function fmtAuto(value) {
  return fmt(value, value % 1 ? 1 : 0);
}

function GroupedBar({ rows, height = 300, yFormatter = (v) => v }) {
  return (
    <MeasuredChart height={height}>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={rows}
          margin={{ top: 8, right: 10, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{
              fill: "rgba(255,255,255,0.43)",
              fontSize: 11,
              fontWeight: 800,
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={yFormatter}
          />
          <Tooltip
            content={<ChartTooltip formatter={fmtAuto} />}
            cursor={{ fill: "rgba(255,255,255,0.025)" }}
          />
          <Legend
            wrapperStyle={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}
          />
          <Bar
            dataKey="Blue"
            name="Blue"
            fill={BLUE}
            radius={[8, 8, 0, 0]}
            barSize={30}
          />
          <Bar
            dataKey="Orange"
            name="Orange"
            fill={ORANGE}
            radius={[8, 8, 0, 0]}
            barSize={30}
          />
        </BarChart>
      )}
    </MeasuredChart>
  );
}

function TeamSplit({ blue, orange, label, formatter = fmt }) {
  const total = Math.max(1, n(blue) + n(orange));
  const bluePct = (n(blue) / total) * 100;
  const orangePct = (n(orange) / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="font-black uppercase tracking-widest text-white/38">
          {label}
        </span>
        <span className="stat-num text-white/55">
          <span className="text-blue-300">{formatter(blue)}</span>
          <span className="mx-2 text-white/20">vs</span>
          <span className="text-orange-300">{formatter(orange)}</span>
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full border border-white/8 bg-white/4">
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${bluePct}%`,
            background: "linear-gradient(90deg,#1d4ed8,#60a5fa)",
          }}
        />
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: `${orangePct}%`,
            background: "linear-gradient(90deg,#fb923c,#c2410c)",
          }}
        />
      </div>
    </div>
  );
}

function MetricTable({ blue, orange }) {
  const rows = [
    ["BPM", blue.bpm, orange.bpm, (v) => fmt(v, 1)],
    [
      "Avg Amount",
      blue.averageBoostTotal,
      orange.averageBoostTotal,
      (v) => fmt(v, 1),
    ],
    [
      "Time 0 boost",
      blue.zeroBoostSeconds,
      orange.zeroBoostSeconds,
      fmtSeconds,
    ],
    [
      "Time 100 boost",
      blue.fullBoostSeconds,
      orange.fullBoostSeconds,
      fmtSeconds,
    ],
    ["Amount collected", blue.amountCollected, orange.amountCollected, fmt],
    ["Boost used", blue.boostUsed, orange.boostUsed, fmt],
    ["Amount stolen", blue.amountStolen, orange.amountStolen, fmt],
    ["Big pads count", blue.bigPads, orange.bigPads, fmt],
    ["Small pads count", blue.smallPads, orange.smallPads, fmt],
    ["Stolen big pads count", blue.stolenBigPads, orange.stolenBigPads, fmt],
    ["Stolen small pads", blue.stolenSmallPads, orange.stolenSmallPads, fmt],
    ["Overfill total", blue.overfillTotal, orange.overfillTotal, fmt],
    [
      "Overfill from stolen",
      blue.overfillFromStolen,
      orange.overfillFromStolen,
      fmt,
    ],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
      <div className="grid grid-cols-[1fr_92px_92px] border-b border-white/7 bg-white/4 px-4 py-3">
        <span className="section-label">Metric</span>
        <span className="section-label text-right text-blue-300">Blue</span>
        <span className="section-label text-right text-orange-300">Orange</span>
      </div>
      {rows.map(([label, blueVal, orangeVal, formatter]) => (
        <div
          key={label}
          className="grid grid-cols-[1fr_92px_92px] border-b border-white/5.5 px-4 py-3 last:border-b-0"
        >
          <span className="text-xs font-bold text-white/46">{label}</span>
          <span className="stat-num text-right text-xs font-black text-blue-200">
            {formatter(blueVal)}
          </span>
          <span className="stat-num text-right text-xs font-black text-orange-200">
            {formatter(orangeVal)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DriverRows({ players }) {
  const maxCollected = Math.max(
    1,
    ...players.map((p) => n(p.boostCollectedApprox)),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/7 bg-white/2">
      {players.map((player) => {
        const color = player.team === 0 ? BLUE : ORANGE;
        return (
          <div
            key={player.playerName}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/6 px-5 py-4 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                />
                <span className="truncate text-sm font-bold text-white/80">
                  {shortName(player.playerName, 22)}
                </span>
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  style={{ background: `${color}18`, color }}
                >
                  {player.team === 0 ? "Blue" : "Orange"}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(n(player.boostCollectedApprox) / maxCollected) * 100}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-right">
              <div>
                <div className="section-label">BPM</div>
                <div className="stat-num text-sm font-black text-white/75">
                  {fmt(player.bpm, 1)}
                </div>
              </div>
              <div>
                <div className="section-label">Avg</div>
                <div className="stat-num text-sm font-black text-white/75">
                  {fmt(player.averageBoost, 1)}
                </div>
              </div>
              <div>
                <div className="section-label">Units</div>
                <div className="stat-num text-sm font-black text-emerald-300">
                  {fmt(player.boostCollectedApprox)}
                </div>
              </div>
              <div>
                <div className="section-label">Used</div>
                <div className="stat-num text-sm font-black text-white/75">
                  {fmt(player.boostUsed, 1)}
                </div>
              </div>
              <div>
                <div className="section-label">Big</div>
                <div className="stat-num text-sm font-black text-sky-300">
                  {fmt(player.bigPads)}
                </div>
              </div>
              <div>
                <div className="section-label">Small</div>
                <div className="stat-num text-sm font-black text-violet-300">
                  {fmt(player.smallPads)}
                </div>
              </div>
              <div>
                <div className="section-label">Stolen</div>
                <div className="stat-num text-sm font-black text-amber-300">
                  {fmt(player.amountStolen)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BoostTeam() {
  const { data, loading, error, refetch } = usePageData("/api/boost-team");
  const analysis = useAnalysisJob(refetch);

  const status = loading ? "loading" : error || !data ? "empty" : "ready";

  const teams = useMemo(() => data?.teams ?? [], [data]);
  const blue = useMemo(
    () => teams.find((t) => t.team === 0) ?? EMPTY_TEAM,
    [teams],
  );
  const orange = useMemo(
    () => teams.find((t) => t.team === 1) ?? EMPTY_TEAM,
    [teams],
  );
  const players = useMemo(
    () =>
      [...(data?.players ?? [])].sort(
        (a, b) =>
          a.team - b.team || b.boostCollectedApprox - a.boostCollectedApprox,
      ),
    [data],
  );

  const economyRows = useMemo(
    () => [
      { metric: "BPM", Blue: n(blue.bpm), Orange: n(orange.bpm) },
      {
        metric: "Avg boost",
        Blue: n(blue.averageBoostTotal),
        Orange: n(orange.averageBoostTotal),
      },
      {
        metric: "Collected",
        Blue: n(blue.amountCollected),
        Orange: n(orange.amountCollected),
      },
      { metric: "Used", Blue: n(blue.boostUsed), Orange: n(orange.boostUsed) },
      {
        metric: "Stolen",
        Blue: n(blue.amountStolen),
        Orange: n(orange.amountStolen),
      },
    ],
    [blue, orange],
  );

  const reserveRows = useMemo(
    () => [
      {
        metric: "0 boost",
        Blue: n(blue.zeroBoostSeconds),
        Orange: n(orange.zeroBoostSeconds),
      },
      {
        metric: "100 boost",
        Blue: n(blue.fullBoostSeconds),
        Orange: n(orange.fullBoostSeconds),
      },
    ],
    [blue, orange],
  );

  const padRows = useMemo(
    () => [
      { metric: "Big pads", Blue: n(blue.bigPads), Orange: n(orange.bigPads) },
      {
        metric: "Stolen big",
        Blue: n(blue.stolenBigPads),
        Orange: n(orange.stolenBigPads),
      },
      {
        metric: "Small pads",
        Blue: n(blue.smallPads),
        Orange: n(orange.smallPads),
      },
      {
        metric: "Stolen small",
        Blue: n(blue.stolenSmallPads),
        Orange: n(orange.stolenSmallPads),
      },
    ],
    [blue, orange],
  );

  const overfillRows = useMemo(
    () => [
      {
        metric: "Overfill total",
        Blue: n(blue.overfillTotal),
        Orange: n(orange.overfillTotal),
      },
      {
        metric: "From stolen",
        Blue: n(blue.overfillFromStolen),
        Orange: n(orange.overfillFromStolen),
      },
    ],
    [blue, orange],
  );

  const totalCollected = n(blue.amountCollected) + n(orange.amountCollected);
  const totalBigPads = n(blue.bigPads) + n(orange.bigPads);
  const totalSmallPads = n(blue.smallPads) + n(orange.smallPads);
  const totalStolen = n(blue.amountStolen) + n(orange.amountStolen);
  const totalOverfill = n(blue.overfillTotal) + n(orange.overfillTotal);
  const bpmLeader = n(blue.bpm) >= n(orange.bpm) ? "Blue" : "Orange";
  const stealLeader =
    n(blue.amountStolen) >= n(orange.amountStolen) ? "Blue" : "Orange";

  return (
    <ReplayPage status={status} analysis={analysis} error={error}>
      <div className="anim-fade-in">
        <PageHeader
          gradient={HEADER_GRADIENT}
          eyebrow="Team boost command center"
          EyebrowIcon={Sparkles}
          eyebrowColor="#6ee7b7"
          title="Team Boost Analytics"
          description="Boost economy, reserve pressure, pad control, stolen boost and overfill waste by team."
          onUpload={analysis.handleAnalysisStart}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <HeroMetric
              label="Collected (units)"
              value={fmt(totalCollected)}
              detail="Visible boost meter gains"
              color={GREEN}
              Icon={Database}
            />
            <HeroMetric
              label="Big Pads"
              value={fmt(totalBigPads)}
              detail="Large boost pad pickups (count)"
              color={BLUE}
              Icon={BatteryCharging}
            />
            <HeroMetric
              label="Small Pads"
              value={fmt(totalSmallPads)}
              detail="Small boost pad pickups (count)"
              color={PURPLE}
              Icon={Layers}
            />
            <HeroMetric
              label="Stolen Amount"
              value={fmt(totalStolen)}
              detail={`${stealLeader} stole more boost`}
              color={GOLD}
              Icon={Zap}
            />
            <HeroMetric
              label="BPM Leader"
              value={bpmLeader}
              detail={`${fmt(Math.max(n(blue.bpm), n(orange.bpm)), 1)} team BPM`}
              color={bpmLeader === "Blue" ? BLUE : ORANGE}
              Icon={Gauge}
            />
            <HeroMetric
              label="Overfill"
              value={fmt(totalOverfill)}
              detail="Estimated boost lost to cap"
              color={RED}
              Icon={BatteryCharging}
            />
            <HeroMetric
              label="Match Time"
              value={fmtSeconds(data?.matchDuration)}
              detail={data?.mapName ?? "Replay map"}
              color={PURPLE}
              Icon={Clock}
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-white/35">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1">
              <Layers size={12} /> {data?.replayName ?? "Replay"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1">
              <ShieldAlert size={12} /> Stolen and overfill are estimated from
              pickup events
            </span>
          </div>
        </PageHeader>

        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
            <Panel
              eyebrow="Teams Overview"
              title="Boost Economy"
              subtitle="BPM, average boost, collected amount and stolen amount"
              Icon={Activity}
              accent={GREEN}
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <GroupedBar rows={economyRows} height={320} />
                <div className="space-y-5 rounded-2xl border border-white/7 bg-white/2.5 p-5">
                  <TeamSplit
                    label="Boost collected"
                    blue={blue.amountCollected}
                    orange={orange.amountCollected}
                    formatter={fmt}
                  />
                  <TeamSplit
                    label="Boost stolen amount"
                    blue={blue.amountStolen}
                    orange={orange.amountStolen}
                    formatter={fmt}
                  />
                  <TeamSplit
                    label="BPM"
                    blue={blue.bpm}
                    orange={orange.bpm}
                    formatter={(v) => fmt(v, 1)}
                  />
                  <TeamSplit
                    label="Avg boost total"
                    blue={blue.averageBoostTotal}
                    orange={orange.averageBoostTotal}
                    formatter={(v) => fmt(v, 1)}
                  />
                </div>
              </div>
            </Panel>

            <Panel
              eyebrow="Reference Table"
              title="Team Metrics"
              subtitle="Reference layout for fast comparison"
              Icon={Database}
              accent={BLUE}
            >
              <MetricTable blue={blue} orange={orange} />
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel
              eyebrow="Reserve State"
              title="Boost Starvation And Full Tank Time"
              subtitle="Seconds spent at 0 and 100 boost, summed across players"
              Icon={BatteryCharging}
              accent={PURPLE}
            >
              <GroupedBar
                rows={reserveRows}
                height={300}
                yFormatter={(v) => `${v}s`}
              />
            </Panel>

            <Panel
              eyebrow="Pad Control"
              title="Collected Pads"
              subtitle="Big, small and stolen pad control by team"
              Icon={Zap}
              accent={GOLD}
            >
              <GroupedBar rows={padRows} height={300} />
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel
              eyebrow="Overfill"
              title="Estimated Boost Waste"
              subtitle="Overfill = pad value minus visible boost gain when the player is near full"
              Icon={BatteryCharging}
              accent={RED}
            >
              <GroupedBar rows={overfillRows} height={300} />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/7 bg-white/3 p-4">
                  <div className="section-label">Blue steal efficiency</div>
                  <div className="stat-num mt-2 text-2xl font-black text-blue-300">
                    {fmtPct(blue.boostStealPct)}
                  </div>
                  <p className="mt-1 text-xs text-white/30">
                    Stolen amount divided by collected amount
                  </p>
                </div>
                <div className="rounded-2xl border border-white/7 bg-white/3 p-4">
                  <div className="section-label">Orange steal efficiency</div>
                  <div className="stat-num mt-2 text-2xl font-black text-orange-300">
                    {fmtPct(orange.boostStealPct)}
                  </div>
                  <p className="mt-1 text-xs text-white/30">
                    Stolen amount divided by collected amount
                  </p>
                </div>
              </div>
            </Panel>

            <Panel
              eyebrow="Roster Contribution"
              title="Team Drivers"
              subtitle="Per-player contribution feeding the team totals"
              Icon={Gauge}
              accent={BLUE}
            >
              <DriverRows players={players} />
            </Panel>
          </section>
        </main>
      </div>
    </ReplayPage>
  );
}
