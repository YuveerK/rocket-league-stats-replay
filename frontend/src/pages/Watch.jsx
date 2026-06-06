import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart2, X } from "lucide-react";
import { BLUE, ORANGE } from "@/features/watch/constants";
import {
  eventPlaybackSeconds,
  sceneTimeForPlayback,
  activeResetSegment,
  hasPlaybackTimeMapping,
  countdownLabel,
} from "@/features/watch/lib/playbackHelpers";
import { rlToThree } from "@/features/watch/lib/rlCoords";
import { n, sampleStateAt } from "@/features/watch/lib/sampleHelpers";
import { SceneViewer } from "@/features/watch/three/SceneViewer";
import { useWatchData } from "@/features/watch/hooks/useWatchData";
import { usePlayback } from "@/features/watch/hooks/usePlayback";
import { WatchHeader } from "@/features/watch/components/WatchHeader";
import { PlayerPanel } from "@/features/watch/components/PlayerPanel";
import { FieldLegend } from "@/features/watch/components/FieldLegend";
import { KickoffCountdown } from "@/features/watch/components/KickoffCountdown";
import { EventPopup } from "@/features/watch/components/EventPopup";
import { WatchControls } from "@/features/watch/components/WatchControls";

function shallowEqualObjects(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]),
  );
}

function setIfChanged(setValue, nextValue) {
  setValue((previous) =>
    shallowEqualObjects(previous, nextValue) ? previous : nextValue,
  );
}

export default function Watch() {
  const { data, loading, error } = useWatchData();
  const playback = usePlayback(data);
  const { currentTime, panSpeedRef, prevTimeRef, duration } = playback;

  const sceneRef = useRef(null);
  const [playerSpeeds, setPlayerSpeeds] = useState({});
  const [playerBoosts, setPlayerBoosts] = useState({});
  const [playerBoosting, setPlayerBoosting] = useState({});
  const [popupEvent, setPopupEvent] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const popupKeyRef = useRef(0);

  const usesMappedPlayback = hasPlaybackTimeMapping(data);
  const sceneTime = sceneTimeForPlayback(data, currentTime);
  const resetSegment = usesMappedPlayback
    ? null
    : activeResetSegment(data?.resetSegments, currentTime);
  const countdown = countdownLabel(resetSegment, sceneTime);

  const currentEvent = useMemo(() => {
    const events = data?.events ?? [];
    let latest = null;
    for (const ev of events) {
      if (eventPlaybackSeconds(ev) <= currentTime) latest = ev;
      else break;
    }
    return latest;
  }, [currentTime, data]);

  // Drive the Three.js scene time — no setState here, so no React render cascade.
  // updateScene is called inside the Three.js animate loop, which reads playbackSeconds.
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.playbackSeconds = sceneTime;
  }, [sceneTime]);

  // Poll player stats from the Three.js scene at ~10fps for the UI panels.
  // Done via interval rather than a per-frame effect to avoid overwhelming React
  // with setState calls that would exceed its nested-update limit at 60fps.
  useEffect(() => {
    const id = setInterval(() => {
      const stats = sceneRef.current?.playerStats;
      if (!stats) return;
      setIfChanged(setPlayerSpeeds, stats.speeds ?? {});
      setIfChanged(setPlayerBoosts, stats.boosts ?? {});
      setIfChanged(setPlayerBoosting, stats.boosting ?? {});
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Event popup — fires whenever playback crosses any event timestamp
  useEffect(() => {
    if (!data) return;
    const prev = prevTimeRef.current;
    if (currentTime <= prev) return;
    for (const ev of data.events ?? []) {
      const t = eventPlaybackSeconds(ev);
      if (t > prev && t <= currentTime) {
        popupKeyRef.current += 1;
        setPopupEvent({ ...ev, _key: popupKeyRef.current });
        break;
      }
    }
  }, [currentTime, data, prevTimeRef]);

  // Goal explosion effects
  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = currentTime;
    if (!data || !sceneRef.current?.triggerExplosion || currentTime < prev)
      return;
    for (const ev of data.events ?? []) {
      if (ev.type !== "goal") continue;
      const t = eventPlaybackSeconds(ev);
      if (t > prev && t <= currentTime) {
        const ballState = sampleStateAt(
          data.ball?.samples,
          n(ev.elapsedSeconds, sceneTime),
        );
        const pos = ballState
          ? rlToThree(ballState.x, ballState.y, ballState.z)
          : sceneRef.current.ball.position.clone();
        sceneRef.current.triggerExplosion(pos, ev.team === 0 ? BLUE : ORANGE);
      }
    }
  }, [currentTime, data, sceneTime, prevTimeRef]);

  const bluePlayers = (data?.players ?? []).filter((p) => p.team === 0);
  const orangePlayers = (data?.players ?? []).filter((p) => p.team === 1);

  if (loading)
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-4"
        style={{ background: "#02040a" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full"
          style={{
            border: "2px solid rgba(255,255,255,0.06)",
            borderTopColor: "rgba(96,165,250,0.55)",
          }}
        />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
          Loading Replay
        </p>
      </div>
    );

  if (error)
    return (
      <div
        className="flex h-screen items-center justify-center px-6"
        style={{ background: "#02040a" }}
      >
        <div
          className="max-w-md rounded-2xl p-5 text-sm"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.14)",
            color: "rgba(252,165,165,0.7)",
          }}
        >
          {error}
        </div>
      </div>
    );

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={{ background: "#6fa8d0" }}
    >
      <WatchHeader data={data} duration={duration} />

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <SceneViewer
          data={data}
          panSpeedRef={panSpeedRef}
          sceneRef={sceneRef}
        />
        <KickoffCountdown label={countdown} />
        <EventPopup event={popupEvent} />

        {/* Mobile toggle for player stats panel */}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl sm:hidden"
          style={{
            background: "rgba(5,8,22,0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.5)",
          }}
          aria-label={panelOpen ? "Hide stats" : "Show stats"}
        >
          {panelOpen ? <X size={15} /> : <BarChart2 size={15} />}
        </button>

        <section
          className={`pointer-events-none absolute flex-col gap-2.5 sm:left-4 sm:top-4 sm:flex sm:w-52 ${
            panelOpen ? "left-3 top-14 flex w-44" : "hidden"
          }`}
        >
          {/* Clock */}
          <div
            className="rounded-2xl p-3.5 backdrop-blur-2xl"
            style={{
              background: "rgba(5,8,22,0.85)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-end justify-between gap-2">
              <div>
                <div
                  className="mb-0.5 text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  Time
                </div>
                <div
                  className="text-[28px] font-black tabular-nums leading-none"
                  style={{ color: "rgba(226,232,240,0.95)" }}
                >
                  {String(
                    Math.floor(Math.max(0, Math.floor(currentTime)) / 60),
                  ).padStart(1, "0")}
                  :
                  {String(Math.max(0, Math.floor(currentTime)) % 60).padStart(
                    2,
                    "0",
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="mb-0.5 text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  Event
                </div>
                <div
                  className="max-w-24 truncate text-[11px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  {currentEvent
                    ? `${currentEvent.type[0].toUpperCase()}${currentEvent.type.slice(1)} - ${currentEvent.playerName ?? ""}`
                    : "No event yet"}
                </div>
              </div>
            </div>
          </div>
          <PlayerPanel
            team={0}
            players={bluePlayers}
            speeds={playerSpeeds}
            boosts={playerBoosts}
            boosting={playerBoosting}
          />
          <PlayerPanel
            team={1}
            players={orangePlayers}
            speeds={playerSpeeds}
            boosts={playerBoosts}
            boosting={playerBoosting}
          />
        </section>

        <FieldLegend />

        <WatchControls
          data={data}
          duration={duration}
          currentTime={currentTime}
          setCurrentTime={playback.setCurrentTime}
          playing={playback.playing}
          setPlaying={playback.setPlaying}
          speed={playback.speed}
          setSpeed={playback.setSpeed}
          SPEEDS={playback.SPEEDS}
          panSpeed={playback.panSpeed}
          setPanSpeed={playback.setPanSpeed}
          PAN_SPEED_MIN={playback.PAN_SPEED_MIN}
          PAN_SPEED_MAX={playback.PAN_SPEED_MAX}
          reset={playback.reset}
          sceneRef={sceneRef}
        />
      </main>
    </div>
  );
}
