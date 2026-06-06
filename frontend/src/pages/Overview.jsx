import {
  Clock,
  Map,
  Trophy,
  Server,
  Gamepad2,
  Users,
  User,
  CalendarDays,
} from "lucide-react";
import Scoreboard from "@/components/Scoreboard";
import EventTimeline from "@/components/EventTimeline";
import TeamStats from "@/components/TeamStats";
import BoostEconomyPanel from "@/components/BoostEconomyPanel";
import GoalBreakdown from "@/components/GoalBreakdown";
import UploadReplay from "@/components/UploadReplay";
import AnalysisProgress from "@/components/AnalysisProgress";
import { usePageData } from "@/hooks/usePageData";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";
import { formatDuration } from "@/lib/formatters";

const PLAYLIST_LABELS = {
  1: "Casual 1v1",
  2: "Casual 2v2",
  3: "Casual 3v3",
  4: "Chaos",
  10: "Ranked 1v1",
  11: "Ranked 2v2",
  13: "Ranked 3v3",
  27: "Hoops",
  28: "Rumble",
  29: "Dropshot",
  30: "Snow Day",
  34: "Tournament",
  44: "Dropshot Rumble",
  46: "Heatseeker",
};

function playlistLabel(id) {
  return PLAYLIST_LABELS[id] ?? (id != null ? `Playlist ${id}` : null);
}

function formatMatchDate(dateStr) {
  if (!dateStr) return null;
  const normalized = String(dateStr).replace(
    /(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})/,
    "$1T$2:$3:$4",
  );
  const d = new Date(normalized);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MetaBadge({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/8 text-white/50">
      <Icon size={10} className="text-white/30 shrink-0" />
      {children}
    </span>
  );
}

function MatchHero({ match, onAnalysisStart }) {
  return (
    <div
      className="relative overflow-hidden border-b border-white/6"
      style={{
        background:
          "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, #05070f 40%, #05070f 60%, rgba(234,88,12,0.12) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
            transform: "translate(-30%, -30%)",
          }}
        />
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />
      </div>

      <div className="relative px-8 py-8 flex flex-col gap-5 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white/90 leading-tight truncate max-w-lg">
              {match.replayName ?? "Replay"}
            </h1>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40">
              {match.mapName && (
                <span className="flex items-center gap-1.5">
                  <Map size={11} />{" "}
                  {match.mapName.replace(/_P$/, "").replace(/_/g, " ")}
                </span>
              )}
              {match.totalSecondsPlayed && (
                <span className="flex items-center gap-1.5">
                  <Clock size={11} /> {formatDuration(match.totalSecondsPlayed)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <MetaBadge icon={Server}>{match.serverRegion}</MetaBadge>
              <MetaBadge icon={Gamepad2}>
                {playlistLabel(match.playlist)}
              </MetaBadge>
              <MetaBadge icon={Users}>
                {match.teamSize ? `${match.teamSize}v${match.teamSize}` : null}
                {match.matchType ? ` · ${match.matchType}` : null}
              </MetaBadge>
              <MetaBadge icon={CalendarDays}>
                {formatMatchDate(match.date)}
              </MetaBadge>
              <MetaBadge icon={User}>{match.recorderName}</MetaBadge>
            </div>
          </div>
          <UploadReplay onAnalysisStart={onAnalysisStart} compact />
        </div>

        <ScoreDisplay match={match} />

        {match.statMilestones?.length > 0 && (
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {match.statMilestones.map((m, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/60"
              >
                <Trophy size={10} className="text-yellow-400" />
                <span className="font-medium text-white/80">
                  {m.playerName}
                </span>
                <span>
                  {m.milestone.replace(/_TA$/, "").replace(/_/g, " ")}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreDisplay({ match }) {
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-bold tracking-widest uppercase text-blue-400/70">
          Blue
        </span>
        <span
          className="text-7xl font-black tabular-nums leading-none"
          style={{
            color: "#60a5fa",
            textShadow: "0 0 40px rgba(96,165,250,0.5)",
          }}
        >
          {match.scoreTeam0}
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl font-thin text-white/20">—</span>
        <div className="flex gap-1.5">
          {match.overtime && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
              OT
            </span>
          )}
          {match.forfeit && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-red-500/15 text-red-400 border border-red-500/25">
              FORFEIT
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="text-xs font-bold tracking-widest uppercase text-orange-400/70">
          Orange
        </span>
        <span
          className="text-7xl font-black tabular-nums leading-none"
          style={{
            color: "#fb923c",
            textShadow: "0 0 40px rgba(251,146,60,0.5)",
          }}
        >
          {match.scoreTeam1}
        </span>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data, loading, error, refetch } = usePageData("/api/overview");
  const { analysisJob, handleAnalysisStart, handleAnalysisComplete } =
    useAnalysisJob(refetch);

  return (
    <>
      {analysisJob && (
        <AnalysisProgress
          replayPath={analysisJob.replayPath}
          replayName={analysisJob.replayName}
          onComplete={handleAnalysisComplete}
        />
      )}

      {loading && (
        <div className="flex items-center justify-center min-h-screen text-white/30 text-sm">
          Loading…
        </div>
      )}

      {!loading && (error || !data) && !analysisJob && (
        <div className="p-8 max-w-2xl mx-auto">
          <UploadReplay onAnalysisStart={handleAnalysisStart} />
        </div>
      )}

      {!loading && data && (
        <div className="anim-fade-in">
          <MatchHero match={data.match} onAnalysisStart={handleAnalysisStart} />
          <div className="px-8 py-8 space-y-6 max-w-7xl mx-auto">
            <Scoreboard players={data.players} />
            <BoostEconomyPanel teams={data.teams} players={data.players} />
            <GoalBreakdown goals={data.goalBreakdown} />
            <EventTimeline
              events={data.events}
              matchDuration={data.match.totalSecondsPlayed ?? 300}
            />
            <TeamStats teams={data.teams} />
          </div>
        </div>
      )}
    </>
  );
}
