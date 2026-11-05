import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Speech,
  ScanLine,
  AudioLines,
  Flame,
  Waves,
  IceCreamBowl,
  MoonStar,
  ThermometerSun,
  Wind,
  CloudSun,
} from "lucide-react";
import { TRACKS } from "../data/tracks";
import { analyzeImage, loadImage, pcName, type Features } from "../audio/analysis";
import { jukeboxEngine, type Readout } from "../audio/engine";
import Telemetry from "./Telemetry";

const TRACK_ICONS = [ThermometerSun, MoonStar, Waves, IceCreamBowl, Flame, CloudSun];

export default function Jukebox() {
  const [trackIdx, setTrackIdx] = useState(0);
  const [features, setFeatures] = useState<Features | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [rhythm, setRhythm] = useState(true);
  const [beamOn, setBeamOn] = useState(true);
  const [readout, setReadout] = useState<Readout>({ scan: 0, region: 0, melody: null, chord: "—" });
  const [announcement, setAnnouncement] = useState("");
  const [probe, setProbe] = useState<string | null>(null);

  const track = TRACKS[trackIdx];

  const beamRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const probeTimer = useRef<number | undefined>(undefined);

  /* ---------- engine wiring ---------- */
  useEffect(() => {
    jukeboxEngine.onScan = (scan) => {
      const pct = `${(scan * 100).toFixed(2)}%`;
      if (beamRef.current) beamRef.current.style.left = pct;
      if (trailRef.current) trailRef.current.style.width = pct;
      if (ringRef.current) {
        const C = 2 * Math.PI * 46;
        ringRef.current.style.strokeDashoffset = String(C * (1 - scan));
      }
    };
    jukeboxEngine.onReadout = (r) => setReadout(r);
    return () => {
      jukeboxEngine.onScan = null;
      jukeboxEngine.onReadout = null;
    };
  }, []);

  /* ---------- load + analyze current record ---------- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFeatures(null);
    setProbe(null);
    loadImage(track.img)
      .then((img) => {
        if (cancelled) return;
        const f = analyzeImage(img);
        setFeatures(f);
        jukeboxEngine.load(track, f);
        setLoading(false);
        setAnnouncement(
          `Record ${trackIdx + 1} of ${TRACKS.length}: ${track.title}. ${track.dataset}. Tonic ${pcName(
            f.rootPc
          )} ${f.mode}, ${track.groove.bpm} beats per minute. Press play to listen.`
        );
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdx]);

  /* stop narration when leaving */
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const togglePlay = useCallback(() => {
    if (loading) return;
    jukeboxEngine.toggle();
    const p = jukeboxEngine.playing;
    setPlaying(p);
    setAnnouncement(p ? `Now playing: ${track.title}. ${track.dataset}.` : "Paused. Needle lifted.");
  }, [loading, track]);

  const selectTrack = useCallback((i: number) => {
    setTrackIdx(((i % TRACKS.length) + TRACKS.length) % TRACKS.length);
  }, []);

  const stepTrack = useCallback((dir: 1 | -1) => {
    setTrackIdx((i) => (i + dir + TRACKS.length) % TRACKS.length);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      jukeboxEngine.setMuted(!m);
      return !m;
    });
  }, []);

  const toggleRhythm = useCallback(() => {
    setRhythm((r) => {
      jukeboxEngine.setRhythm(!r);
      return !r;
    });
  }, []);

  const speakStory = () => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setAnnouncement("Speech narration is not available in this browser.");
      return;
    }
    if (synth.speaking) {
      synth.cancel();
      setAnnouncement("Narration stopped.");
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(track.narration);
    u.rate = 0.97;
    u.pitch = 0.92;
    u.volume = 1;
    synth.speak(u);
    setAnnouncement(`Narrating: ${track.title}`);
  };

  const auditionAt = (rel: number) => {
    if (!features) return;
    const clamped = Math.min(0.999, Math.max(0, rel));
    const col = features.columns[Math.floor(clamped * features.columns.length)];
    jukeboxEngine.pluckPixel(col);
    window.clearTimeout(probeTimer.current);
    setProbe(`PING @ ${Math.round(clamped * 100)}% · LUM ${Math.round(col.l * 100)}% · SAT ${Math.round(col.s * 100)}%`);
    probeTimer.current = window.setTimeout(() => setProbe(null), 2000);
  };

  const onArtClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    auditionAt((e.clientX - rect.left) / rect.width);
  };

  const onArtKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      auditionAt(jukeboxEngine.scan);
    }
  };

  /* ---------- keyboard deck ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= TRACKS.length) return selectTrack(num - 1);
      switch (e.key) {
        case " ":
          if (document.activeElement === document.body) {
            e.preventDefault();
            togglePlay();
          }
          break;
        case "ArrowRight":
          stepTrack(1);
          break;
        case "ArrowLeft":
          stepTrack(-1);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "g":
        case "G":
          toggleRhythm();
          break;
        case "b":
        case "B":
          setBeamOn((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectTrack, stepTrack, togglePlay, toggleMute, toggleRhythm]);

  const ticker = useMemo(
    () => TRACKS.map((t) => `${t.title} — ${t.dataset}`).join("   ✦   "),
    []
  );

  const circumference = 2 * Math.PI * 46;

  return (
    <section id="jukebox" aria-label="The Earth Jukebox — sonified NASA visualizations" className="relative">
      {/* screen-reader narration of state */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_290px]">
        {/* ============ LEFT — THE SELECTOR ============ */}
        <div className="panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-cyan/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <AudioLines className="h-4 w-4 text-cyan" aria-hidden="true" />
              <h2 className="font-mono text-[0.68rem] font-semibold tracking-[0.35em] text-cyan">
                THE SELECTOR
              </h2>
            </div>
            <span className="chip">06 RECORDS</span>
          </div>

          <ol className="flex flex-col gap-1.5 overflow-y-auto p-3" role="list">
            {TRACKS.map((t, i) => {
              const active = i === trackIdx;
              const Icon = TRACK_ICONS[i] ?? Wind;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => selectTrack(i)}
                    aria-pressed={active}
                    aria-label={`Record ${i + 1}: ${t.title} — ${t.dataset}`}
                    className={`track-row group flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/[0.02] px-2 py-2 text-left ${
                      active ? "" : "hover:bg-white/[0.045]"
                    }`}
                  >
                    <span
                      className={`font-mono text-[0.65rem] ${active ? "text-cyan" : "text-ink-dim"} w-5`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10">
                      <img
                        src={t.img}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {active && playing && (
                        <span className="absolute inset-0 flex items-end justify-center gap-[3px] bg-black/35 pb-1.5" aria-hidden="true">
                          {[0, 1, 2, 3].map((b) => (
                            <span
                              key={b}
                              className="eq-bar w-[3px] rounded-sm bg-cyan"
                              style={{ height: "14px", animationDelay: `${b * 0.13}s` }}
                            />
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[0.8rem] font-semibold leading-tight ${active ? "text-white" : "text-ink"}`}>
                        {t.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.58rem] text-ink-dim">
                        {t.dataset}
                      </span>
                      <span className="mt-1 hidden items-center gap-1 font-mono text-[0.5rem] tracking-wider text-cyan-dim sm:flex">
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {t.groove.bpm} BPM · {t.groove.energy.toUpperCase()}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-auto border-t border-cyan/10 px-5 py-3">
            <p className="font-mono text-[0.53rem] leading-relaxed text-ink-dim">
              EVERY RECORD IS A LIVE SYNTHESIS — NO SAMPLES, NO LOOPS OF AUDIO. THE PIXELS UNDER THE
              BEAM COMPOSE THE NEXT EIGHTH NOTE IN REAL TIME.
            </p>
          </div>
        </div>

        {/* ============ CENTER — THE STAGE ============ */}
        <div className="panel scanlines vignette relative flex flex-col overflow-hidden">
          {/* dataset strip */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-cyan/10 px-5 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[0.55rem] tracking-[0.3em] text-cyan-dim">NOW SPINNING · EIC FRAME</p>
              <p className="truncate text-[0.72rem] font-medium text-ink-dim">{track.credit}</p>
            </div>
            <span className="chip chip-amber shrink-0">{track.era}</span>
          </div>

          {/* artwork with beam */}
          <div className="relative z-10 px-5 pt-3">
            <div
              role="img"
              aria-label={track.alt}
              onClick={onArtClick}
              onKeyDown={onArtKeyDown}
              tabIndex={0}
              title="Click any point of the frame to audition that column"
              className="group relative mx-auto aspect-square w-full max-w-[400px] cursor-crosshair select-none overflow-hidden rounded-2xl border border-cyan/25 bg-black shadow-[0_0_60px_rgba(79,216,255,0.12),inset_0_0_80px_rgba(0,0,0,0.6)] outline-offset-4"
            >
              <img
                src={track.img}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
              <div ref={trailRef} className="beam-trail" style={{ width: "0%" }} aria-hidden="true" />
              {beamOn && <div ref={beamRef} className="beam" style={{ left: "0%" }} aria-hidden="true" />}

              {/* corner reticles */}
              {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map(
                (pos) => (
                  <span key={pos} aria-hidden="true" className={`pointer-events-none absolute z-[6] h-6 w-6 border-cyan/70 ${pos}`} />
                )
              )}

              {/* live badge */}
              <div className="pointer-events-none absolute left-4 top-4 z-[6] flex items-center gap-1.5 rounded-full border border-red-400/40 bg-black/55 px-2.5 py-1 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 led-on" aria-hidden="true" />
                <span className="font-mono text-[0.5rem] tracking-[0.28em] text-red-200">LIVE SONIFICATION</span>
              </div>

              {/* probe readout */}
              {probe && (
                <div className="pointer-events-none absolute left-1/2 top-12 z-[6] -translate-x-1/2 whitespace-nowrap rounded-full border border-amber/50 bg-black/70 px-3 py-1 font-mono text-[0.55rem] tracking-widest text-amber backdrop-blur-sm">
                  {probe}
                </div>
              )}

              {/* loading veil */}
              {loading && (
                <div className="absolute inset-0 z-[7] flex flex-col items-center justify-center gap-3 bg-[#05070f]/70 backdrop-blur-[2px]">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" aria-hidden="true" />
                  <p className="font-mono text-[0.6rem] tracking-[0.35em] text-cyan">CALIBRATING OPTICS…</p>
                </div>
              )}
            </div>
          </div>

          {/* title + narrate */}
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-3 px-6 pt-3">
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-bold leading-none tracking-tight text-white sm:text-3xl">
                {track.title}
              </h3>
              <p className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-cyan/80">
                {track.dataset}
              </p>
            </div>
            <button
              onClick={speakStory}
              className="group flex shrink-0 items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3.5 py-2 font-mono text-[0.58rem] tracking-[0.18em] text-amber transition-colors hover:bg-amber/20"
              aria-label={`Narrate the data story of ${track.title}`}
            >
              <Speech className="h-3.5 w-3.5 transition-transform group-hover:scale-110" aria-hidden="true" />
              HEAR THE STORY
            </button>
          </div>

          {/* transport deck */}
          <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-cyan/10 bg-black/30 px-6 py-4">
            {/* prev / play / next with progress ring */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => stepTrack(-1)}
                aria-label="Previous record"
                className="rounded-full border border-edge2 p-2.5 text-ink-dim transition-all hover:rotate-[-8deg] hover:border-cyan/50 hover:text-cyan"
              >
                <SkipBack className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>

              <div className="relative h-[92px] w-[92px]">
                <svg viewBox="0 0 108 108" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="54" cy="54" r="46" fill="none" stroke="#141b3a" strokeWidth="5" />
                  <circle
                    ref={ringRef}
                    cx="54" cy="54" r="46" fill="none"
                    stroke="url(#ringGrad)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    style={{ transition: "stroke-dashoffset 0.12s linear", filter: "drop-shadow(0 0 6px rgba(79,216,255,0.7))" }}
                  />
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4fd8ff" />
                      <stop offset="100%" stopColor="#ffb454" />
                    </linearGradient>
                  </defs>
                </svg>
                <button
                  onClick={togglePlay}
                  disabled={loading}
                  aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
                  aria-pressed={playing}
                  className="absolute inset-[13px] flex items-center justify-center rounded-full border border-cyan/50 bg-gradient-to-br from-cyan/25 via-cyan/10 to-transparent text-cyan shadow-[0_0_30px_rgba(79,216,255,0.35),inset_0_0_20px_rgba(79,216,255,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {playing ? (
                    <Pause className="h-7 w-7 fill-cyan" aria-hidden="true" />
                  ) : (
                    <Play className="ml-1 h-7 w-7 fill-cyan" aria-hidden="true" />
                  )}
                </button>
              </div>

              <button
                onClick={() => stepTrack(1)}
                aria-label="Next record"
                className="rounded-full border border-edge2 p-2.5 text-ink-dim transition-all hover:rotate-[8deg] hover:border-cyan/50 hover:text-cyan"
              >
                <SkipForward className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            </div>

            {/* toggles */}
            <div className="flex flex-col gap-1.5">
              <TogglePill
                on={rhythm}
                onClick={toggleRhythm}
                label="GROOVE"
                hint="rhythmic engine"
              />
              <TogglePill
                on={beamOn}
                onClick={() => setBeamOn((v) => !v)}
                label="BEAM"
                hint="sweep visual"
                icon={<ScanLine className="h-3 w-3" aria-hidden="true" />}
              />
            </div>

            {/* volume */}
            <div className="flex min-w-[180px] flex-1 items-center gap-3">
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                aria-pressed={muted}
                className="rounded-full border border-edge2 p-2 text-ink-dim transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
              <label className="flex-1">
                <span className="sr-only">Master volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setVolume(v);
                    setMuted(false);
                    jukeboxEngine.setMuted(false);
                    jukeboxEngine.setVolume(v);
                    e.currentTarget.style.setProperty("--fill", `${v * 100}%`);
                  }}
                  className="eic-range w-full"
                  style={{ ["--fill" as string]: `${(muted ? 0 : volume) * 100}%` }}
                  aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
                />
              </label>
            </div>
          </div>
        </div>

        {/* ============ RIGHT — TELEMETRY ============ */}
        <Telemetry features={features} bpm={track.groove.bpm} readout={readout} playing={playing} accent={track.accent} />
      </div>

      {/* ============ TICKER ============ */}
      <div className="mt-5 overflow-hidden border-y border-cyan/10 py-2" aria-hidden="true">
        <div className="ticker-inner font-mono text-[0.62rem] uppercase tracking-[0.25em] text-cyan-dim">
          {ticker}&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;{ticker}
        </div>
      </div>

      {/* liner notes — always available to screen readers */}
      <details className="group mt-4 rounded-xl border border-edge bg-panel/60 open:border-cyan/25">
        <summary className="cursor-pointer list-none px-5 py-3 font-mono text-[0.65rem] tracking-[0.3em] text-amber transition-colors hover:text-amber-hot [&::-webkit-details-marker]:hidden">
          LINER NOTES — WHAT THIS FRAME IS TELLING YOU
        </summary>
        <div className="grid gap-4 border-t border-edge px-5 py-4 text-sm leading-relaxed text-ink-dim md:grid-cols-2">
          <p>{track.science}</p>
          <div>
            <p className="mb-2 font-mono text-[0.55rem] tracking-[0.3em] text-cyan">WHAT TO LISTEN FOR</p>
            <ul className="space-y-1.5">
              {track.listening.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber">▸</span>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </section>
  );
}

function TogglePill({
  on,
  onClick,
  label,
  hint,
  icon,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={`${label} (${hint})`}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.55rem] tracking-[0.22em] transition-all ${
        on
          ? "border-cyan/60 bg-cyan/15 text-cyan shadow-[0_0_14px_rgba(79,216,255,0.3)]"
          : "border-edge2 text-ink-dim hover:text-ink"
      }`}
    >
      {icon}
      {label}
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-cyan" : "bg-zinc-600"}`} aria-hidden="true" />
    </button>
  );
}
