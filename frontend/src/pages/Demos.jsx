import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Flame,
  ShieldAlert,
  Swords,
  Target,
  Trophy,
  Upload,
  Zap,
} from "lucide-react";
import { HeroMetric } from "@/components/ui/HeroMetric";
import { Panel } from "@/components/ui/Panel";
import { MeasuredChart } from "@/components/ui/MeasuredChart";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { PageHeader } from "@/components/layout/PageHeader";
import ReplayPage from "@/components/layout/ReplayPage";
import DemoMatrix from "@/components/DemoMatrix";
import { usePageData } from "@/hooks/usePageData";
import { n, fmt, fmtDuration, shortName } from "@/lib/formatters";
import {
  BLUE,
  ORANGE,
  GREEN,
  PURPLE,
  GOLD,
  RED,
  TEAM_COLORS,
  TEAM_LABELS,
} from "@/lib/colors";

const DEMOS_HEADER_GRADIENT =
  "radial-gradient(circle at 16% 0%, rgba(244,63,94,0.20), transparent 31%), " +
  "radial-gradient(circle at 84% 0%, rgba(251,146,60,0.17), transparent 30%), " +
  "linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)";

function TeamDuel({ blue, orange, label }) {
  const total = Math.max(1, n(blue) + n(orange));
  const bluePct = (n(blue) / total) * 100;
  const orangePct = (n(orange) / total) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="section-label">{label}</div>
          <div className="mt-1 flex items-end gap-3">
            <span className="stat-num text-4xl font-black text-blue-300">
              {fmt(blue)}
            </span>
            <span className="mb-1 text-xs font-bold uppercase tracking-widest text-white/25">
              Blue
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="section-label">{label}</div>
          <div className="mt-1 flex items-end justify-end gap-3">
            <span className="mb-1 text-xs font-bold uppercase tracking-widest text-white/25">
              Orange
            </span>
            <span className="stat-num text-4xl font-black text-orange-300">
              {fmt(orange)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative h-7 overflow-hidden rounded-full border border-white/8 bg-white/4">
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${bluePct}%`,
            background: "linear-gradient(90deg,#1d4ed8,#60a5fa)",
            boxShadow: "0 0 22px rgba(96,165,250,0.45)",
          }}
        />
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: `${orangePct}%`,
            background: "linear-gradient(90deg,#fb923c,#c2410c)",
            boxShadow: "0 0 22px rgba(251,146,60,0.45)",
          }}
        />
      </div>
    </div>
  );
}

function PlayerBarChart({ rows, dataKey, name, accent }) {
  const height = Math.max(260, rows.length * 45);
  const max = Math.max(1, ...rows.map((row) => n(row[dataKey])));

  return (
    <MeasuredChart height={height}>
      {({ width, height }) => (
        <BarChart
          width={width}
          height={height}
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis
            type="category"
            dataKey="shortName"
            width={124}
            tick={{
              fill: "rgba(255,255,255,0.42)",
              fontSize: 11,
              fontWeight: 700,
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.025)" }}
          />
          <Bar
            dataKey={dataKey}
            name={name}
            radius={[0, 9, 9, 0]}
            barSize={16}
            label={{
              position: "right",
              fill: "rgba(255,255,255,0.58)",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {rows.map((row) => (
              <Cell
                key={row.playerName}
                fill={
                  row[dataKey] > 0
                    ? (TEAM_COLORS[row.team] ?? accent)
                    : "rgba(148,163,184,0.32)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      )}
    </MeasuredChart>
  );
}

function PlayerImpactRow({ player }) {
  const inflicted = n(player.kills);
  const taken = n(player.deaths);
  const balance = inflicted - taken;
  const color = balance > 0 ? GREEN : balance < 0 ? RED : "#94a3b8";
  const total = Math.max(1, inflicted + taken);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-white/6 px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: TEAM_COLORS[player.team] ?? "#94a3b8" }}
          />
          <span className="truncate text-sm font-bold text-white/80">
            {player.playerName}
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
            style={{
              background: `${TEAM_COLORS[player.team] ?? "#94a3b8"}18`,
              color: TEAM_COLORS[player.team] ?? "#94a3b8",
            }}
          >
            {TEAM_LABELS[player.team] ?? "Team"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${(inflicted / total) * 100}%` }}
            />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
            <div
              className="h-full rounded-full bg-rose-400"
              style={{ width: `${(taken / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-right">
        <div>
          <div className="section-label">For</div>
          <div className="stat-num text-lg font-black text-emerald-300">
            {fmt(inflicted)}
          </div>
        </div>
        <div>
          <div className="section-label">Taken</div>
          <div className="stat-num text-lg font-black text-rose-300">
            {fmt(taken)}
          </div>
        </div>
        <div>
          <div className="section-label">Net</div>
          <div className="stat-num text-lg font-black" style={{ color }}>
            {balance > 0 ? "+" : ""}
            {fmt(balance)}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoTimeline({ events }) {
  if (!events.length) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/3 p-5 text-sm text-white/35">
        No paired demolition events were found in this replay.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const color = TEAM_COLORS[event.team] ?? "#94a3b8";
        return (
          <div
            key={event.id}
            className="grid grid-cols-[70px_1fr_auto] items-center gap-3 rounded-xl border border-white/[0.07] bg-white/2.5 px-4 py-3"
          >
            <span className="stat-num text-xs font-bold text-white/35">
              {event.gameClockRemaining ?? fmtDuration(event.elapsedSeconds)}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                />
                <span className="truncate font-bold text-white/80">
                  {event.playerName}
                </span>
                <span className="text-white/24">demolished</span>
                <span className="truncate font-bold text-white/60">
                  {event.victimPlayerName ?? "Unknown"}
                </span>
              </div>
            </div>
            <span
              className="rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider"
              style={{
                borderColor: `${color}35`,
                background: `${color}12`,
                color,
              }}
            >
              {TEAM_LABELS[event.team] ?? "Team"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TeamPie({ teamRows }) {
  return (
    <MeasuredChart height={250}>
      {({ width, height }) => (
        <PieChart width={width} height={height}>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={teamRows}
            dataKey="demosInflicted"
            nameKey="team"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={94}
            paddingAngle={3}
            label={({ team, demosInflicted }) => `${team}: ${demosInflicted}`}
          >
            {teamRows.map((row) => (
              <Cell key={row.team} fill={row.color} />
            ))}
          </Pie>
        </PieChart>
      )}
    </MeasuredChart>
  );
}

export default function Demos() {
  const { data, loading, error } = usePageData("/api/overview");
  const status = loading ? "loading" : error || !data ? "empty" : "ready";

  const players = useMemo(
    () =>
      (data?.players ?? []).map((player) => ({
        ...player,
        shortName: shortName(player.playerName),
        kills: n(player.kills),
        deaths: n(player.deaths),
        netDemos: n(player.kills) - n(player.deaths),
      })),
    [data],
  );

  const inflictedRows = useMemo(
    () => [...players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths),
    [players],
  );
  const takenRows = useMemo(
    () => [...players].sort((a, b) => b.deaths - a.deaths || a.kills - b.kills),
    [players],
  );
  const impactRows = useMemo(
    () =>
      [...players].sort((a, b) => b.netDemos - a.netDemos || b.kills - a.kills),
    [players],
  );

  const teamRows = useMemo(
    () =>
      [0, 1].map((team) => {
        const tp = players.filter((p) => p.team === team);
        const demosInflicted = tp.reduce((s, p) => s + p.kills, 0);
        const demosTaken = tp.reduce((s, p) => s + p.deaths, 0);
        return {
          team: TEAM_LABELS[team],
          teamId: team,
          demosInflicted,
          demosTaken,
          netDemos: demosInflicted - demosTaken,
          color: TEAM_COLORS[team],
        };
      }),
    [players],
  );

  const blueTeam = teamRows.find((t) => t.teamId === 0) ?? {};
  const orangeTeam = teamRows.find((t) => t.teamId === 1) ?? {};
  const totalDemos = teamRows.reduce((s, t) => s + t.demosInflicted, 0);
  const totalTaken = teamRows.reduce((s, t) => s + t.demosTaken, 0);
  const topInflicter = inflictedRows[0];
  const mostDemoed = takenRows[0];
  const killEvents = (data?.events ?? []).filter((e) => e.type === "kill");

  return (
    <ReplayPage status={status} error={error}>
      <div className="anim-fade-in">
        <PageHeader
          gradient={DEMOS_HEADER_GRADIENT}
          eyebrow="Demolition command center"
          EyebrowIcon={Flame}
          eyebrowColor="#fda4af"
          title="Demolition Analytics"
          description="Team demo pressure, player demolition leaders and who absorbed the most bumps into respawn."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <HeroMetric
              label="Total Demos"
              value={fmt(totalDemos)}
              detail={`${fmt(totalTaken)} demos taken recorded`}
              color={RED}
              Icon={Flame}
            />
            <HeroMetric
              label="Blue Demos"
              value={fmt(blueTeam.demosInflicted)}
              detail={`${fmt(blueTeam.netDemos)} net demo balance`}
              color={BLUE}
              Icon={ShieldAlert}
            />
            <HeroMetric
              label="Orange Demos"
              value={fmt(orangeTeam.demosInflicted)}
              detail={`${fmt(orangeTeam.netDemos)} net demo balance`}
              color={ORANGE}
              Icon={ShieldAlert}
            />
            <HeroMetric
              label="Top Inflicter"
              value={
                topInflicter ? shortName(topInflicter.playerName, 12) : "None"
              }
              detail={`${fmt(topInflicter?.kills)} demos inflicted`}
              color={GOLD}
              Icon={Trophy}
            />
            <HeroMetric
              label="Most Demoed"
              value={mostDemoed ? shortName(mostDemoed.playerName, 12) : "None"}
              detail={`${fmt(mostDemoed?.deaths)} demos taken`}
              color={PURPLE}
              Icon={AlertTriangle}
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-white/35">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/4 px-2.5 py-1">
              <BarChart3 size={12} /> {data?.match?.replayName ?? "Replay"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/4 px-2.5 py-1">
              <Upload size={12} />{" "}
              {fmtDuration(data?.match?.totalSecondsPlayed)} match time
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/4 px-2.5 py-1">
              <Target size={12} /> Demos inflicted = replay kills; demos taken =
              replay deaths
            </span>
          </div>
        </PageHeader>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel
              eyebrow="Teams"
              title="Demos Inflicted By Team"
              subtitle="Blue vs Orange demolition pressure"
              Icon={Swords}
              accent={RED}
            >
              <div className="space-y-6">
                <TeamDuel
                  blue={blueTeam.demosInflicted}
                  orange={orangeTeam.demosInflicted}
                  label="Demos Inflicted"
                />
                <MeasuredChart height={290}>
                  {({ width, height }) => (
                    <BarChart
                      width={width}
                      height={height}
                      data={teamRows}
                      margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                    >
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="team"
                        tick={{
                          fill: "rgba(255,255,255,0.45)",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip />}
                        cursor={{ fill: "rgba(255,255,255,0.025)" }}
                      />
                      <Legend
                        wrapperStyle={{
                          color: "rgba(255,255,255,0.45)",
                          fontSize: 11,
                        }}
                      />
                      <Bar
                        dataKey="demosInflicted"
                        name="Inflicted"
                        fill={RED}
                        radius={[9, 9, 0, 0]}
                        barSize={38}
                      />
                      <Bar
                        dataKey="demosTaken"
                        name="Taken"
                        fill={PURPLE}
                        radius={[9, 9, 0, 0]}
                        barSize={38}
                      />
                    </BarChart>
                  )}
                </MeasuredChart>
              </div>
            </Panel>

            <Panel
              eyebrow="Teams"
              title="Demo Share"
              subtitle="Who created the demolition count"
              Icon={Activity}
              accent={GOLD}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <TeamPie teamRows={teamRows} />
                <div className="space-y-3">
                  {teamRows.map((team) => (
                    <div
                      key={team.team}
                      className="rounded-2xl border border-white/[0.07] bg-white/3 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              background: team.color,
                              boxShadow: `0 0 12px ${team.color}`,
                            }}
                          />
                          <span className="font-black text-white/80">
                            {team.team}
                          </span>
                        </div>
                        <span
                          className="stat-num text-sm font-black"
                          style={{ color: team.color }}
                        >
                          {fmt(team.demosInflicted)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="section-label">For</div>
                          <div className="stat-num text-xl font-black text-emerald-300">
                            {fmt(team.demosInflicted)}
                          </div>
                        </div>
                        <div>
                          <div className="section-label">Taken</div>
                          <div className="stat-num text-xl font-black text-rose-300">
                            {fmt(team.demosTaken)}
                          </div>
                        </div>
                        <div>
                          <div className="section-label">Net</div>
                          <div
                            className="stat-num text-xl font-black"
                            style={{ color: team.netDemos >= 0 ? GREEN : RED }}
                          >
                            {team.netDemos > 0 ? "+" : ""}
                            {fmt(team.netDemos)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel
              eyebrow="Players"
              title="Demos Inflicted By Player"
              subtitle="Who forced the most respawns"
              Icon={Zap}
              accent={GOLD}
            >
              <PlayerBarChart
                rows={inflictedRows}
                dataKey="kills"
                name="Demos inflicted"
                accent={GOLD}
              />
            </Panel>
            <Panel
              eyebrow="Players"
              title="Demos Taken By Player"
              subtitle="Who was removed from play most often"
              Icon={ShieldAlert}
              accent={PURPLE}
            >
              <PlayerBarChart
                rows={takenRows}
                dataKey="deaths"
                name="Demos taken"
                accent={PURPLE}
              />
            </Panel>
          </section>

          <DemoMatrix matrix={data?.demoMatrix} players={players} />

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel
              eyebrow="Players"
              title="Demo Impact Balance"
              subtitle="For, taken and net by player"
              Icon={Target}
              accent={GREEN}
            >
              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/2">
                {impactRows.map((player) => (
                  <PlayerImpactRow key={player.playerName} player={player} />
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="Timeline"
              title="Demolition Log"
              subtitle="Paired demo events from replay timeline"
              Icon={Flame}
              accent={RED}
            >
              <DemoTimeline events={killEvents} />
            </Panel>
          </section>
        </main>
      </div>
    </ReplayPage>
  );
}
