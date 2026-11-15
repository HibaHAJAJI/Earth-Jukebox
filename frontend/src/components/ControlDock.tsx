import { useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  AudioMode,
  CLIMATE_LAYERS,
  CLIMATE_LAYER_ORDER,
  ClimateLayerId,
  MAX_YEAR,
  MIN_YEAR,
  ProbedLocation,
} from '../data/climateLayers';
import { AgentLanguage } from '../engine/agentVoiceClient';
import { EarthSonificationEngine } from '../engine/sonificationEngine';

interface ControlDockProps {
  activeLayer: ClimateLayerId;
  onSelectLayer: (layer: ClimateLayerId) => void;
  year: number;
  onChangeYear: (year: number) => void;
  isTimelapsePlaying: boolean;
  onToggleTimelapse: () => void;
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  audioMode: AudioMode;
  onChangeAudioMode: (mode: AudioMode) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  agentLanguage: AgentLanguage;
  onChangeAgentLanguage: (lang: AgentLanguage) => void;
  agentMuted: boolean;
  agentStatus: 'idle' | 'thinking' | 'speaking';
  agentCaption: string;
  onReplayAgent: () => void;
  onOpenGuide: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  scanLonDeg: number;
  probedLocation: ProbedLocation | null;
  onClearProbe: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  engine: EarthSonificationEngine;
}

const LANGUAGE_OPTIONS: Array<{ id: AgentLanguage; label: string; title: string }> = [
  { id: 'en', label: 'EN', title: 'English voice agent' },
  { id: 'fr', label: 'FR', title: 'French voice agent' },
  { id: 'ar', label: 'AR', title: 'Arabic voice agent' },
];

export function ControlDock({
  activeLayer,
  onSelectLayer,
  year,
  onChangeYear,
  isTimelapsePlaying,
  onToggleTimelapse,
  isPlayingAudio,
  onToggleAudio,
  audioMode,
  onChangeAudioMode,
  volume,
  onChangeVolume,
  agentLanguage,
  onChangeAgentLanguage,
  agentMuted,
  agentStatus,
  agentCaption,
  onReplayAgent,
  onOpenGuide,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  scanLonDeg,
  probedLocation,
  onClearProbe,
  zenMode,
  onToggleZenMode,
  engine,
}: ControlDockProps) {
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = CLIMATE_LAYERS[activeLayer];
  const metric = spec.globalMetricAtYear(year);

  // Live harmonic oscilloscope driven by Web Audio AnalyserNode
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(new ArrayBuffer(128));
    let rafId = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const active = engine.getWaveformData(buffer);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = active ? spec.accentHex : 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();

      if (active) {
        const slice = w / buffer.length;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i * slice, y);
        }
      } else {
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
      }
      ctx.stroke();

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [engine, spec.accentHex, isPlayingAudio]);

  const lonDisplay = `${Math.abs(Math.round(scanLonDeg)).toString().padStart(3, '0')}°${
    scanLonDeg >= 0 ? 'E' : 'W'
  }`;

  return (
    <>
      {zenMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={onToggleZenMode}
            aria-expanded={false}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-[#0B0F19]/92 border border-slate-800 rounded-lg shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Show Controls (H)</span>
          </button>
        </div>
      )}

      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(940px,94vw)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          zenMode ? 'translate-y-[120%] pointer-events-none' : 'translate-y-0'
        }`}
      >
        {/* Collapse Zen Mode Tab */}
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={onToggleZenMode}
            aria-expanded={!zenMode}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-slate-50 bg-[#0B0F19]/92 border border-slate-800 rounded-t-lg transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Hide Controls (H)</span>
          </button>
        </div>

        {/* Main Single-Elevation Observatory Dock */}
        <section
          aria-label="Earth Jukebox Audio and Climate Controls"
          className="rounded-xl border border-slate-800/90 bg-[#0B0F19]/92 px-4 py-3.5 shadow-2xl"
        >
          {/* Mobile Layer Switcher (visible below md breakpoint where header links hide) */}
          <div className="flex md:hidden items-center gap-1 p-1 mb-3 bg-slate-900/90 rounded-lg overflow-x-auto">
            {CLIMATE_LAYER_ORDER.map((id) => {
              const item = CLIMATE_LAYERS[id];
              const isActive = id === activeLayer;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectLayer(id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-slate-50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Probed Surface Region & AI Scientist Commentary Strip */}
          {probedLocation && (
            <div className="mb-3 pb-2.5 border-b border-slate-800/80 text-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
                  <span className="font-medium text-amber-400 whitespace-nowrap">
                    {probedLocation.regionName}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-slate-400 whitespace-nowrap">
                    {Math.abs(probedLocation.lat).toFixed(1)}°
                    {probedLocation.lat >= 0 ? 'N' : 'S'},{' '}
                    {Math.abs(probedLocation.lon).toFixed(1)}°
                    {probedLocation.lon >= 0 ? 'E' : 'W'}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="font-mono tabular-nums font-medium text-slate-100 whitespace-nowrap">
                    {probedLocation.formattedValue}
                  </span>
                  {agentStatus === 'thinking' && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-sky-300">Analyzing climate record…</span>
                    </>
                  )}
                  {agentStatus === 'speaking' && !agentMuted && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-sky-300">Speaking</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {agentCaption && !agentMuted && (
                    <button
                      type="button"
                      onClick={onReplayAgent}
                      title="Replay AI explanation"
                      className="px-2 py-1 text-[11px] font-medium text-sky-300 hover:text-sky-200 hover:bg-slate-800/80 rounded transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-400"
                    >
                      Speak Again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClearProbe}
                    aria-label="Clear probed location"
                    className="p-1 text-slate-400 hover:text-slate-100 rounded transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {agentCaption && (
                <p
                  dir={agentLanguage === 'ar' ? 'rtl' : 'ltr'}
                  className="mt-1.5 text-xs leading-relaxed text-slate-300"
                >
                  {agentCaption}
                </p>
              )}
            </div>
          )}

          {/* Row 1: Transport, Audio Mode, Volume, Agent Language & Globe Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              {/* Primary Audio Play/Pause */}
              <button
                type="button"
                onClick={onToggleAudio}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-2 ${
                  isPlayingAudio
                    ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    : 'bg-slate-100 text-slate-950 hover:bg-white'
                }`}
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause Sound</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Listen to Earth</span>
                  </>
                )}
              </button>

              {/* Dual Audio Mode Segmented Control */}
              <div
                role="group"
                aria-label="Sonification audio mode"
                className="flex items-center gap-1 p-1 bg-slate-900/95 border border-slate-800/80 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => onChangeAudioMode('ambient')}
                  aria-pressed={audioMode === 'ambient'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                    audioMode === 'ambient'
                      ? 'bg-slate-800 text-slate-50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ambient Musical
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAudioMode('pixelScan')}
                  aria-pressed={audioMode === 'pixelScan'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                    audioMode === 'pixelScan'
                      ? 'bg-slate-800 text-slate-50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Live Pixel Scan
                </button>
              </div>
            </div>

            {/* Volume, Agent Language, Globe Spin, Camera Reset & Guide */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeVolume(volume > 0 ? 0 : 0.65)}
                  aria-label={volume === 0 ? 'Unmute Earth music' : 'Mute Earth music'}
                  title={volume === 0 ? 'Unmute Earth music' : 'Mute Earth music'}
                  className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  {volume === 0 ? (
                    <VolumeX className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={volume}
                  onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                  aria-label="Master Earth music volume"
                  className="observatory-slider w-20"
                />
              </div>

              {/* Switchable Voice Agent Language (EN / FR / AR) */}
              <div
                role="group"
                aria-label="Voice agent language"
                className="flex items-center gap-0.5 p-1 bg-slate-900/95 border border-slate-800/80 rounded-lg"
              >
                {LANGUAGE_OPTIONS.map((opt) => {
                  const active = agentLanguage === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeAgentLanguage(opt.id)}
                      aria-pressed={active}
                      title={opt.title}
                      className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        active
                          ? 'bg-sky-500/20 text-sky-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onToggleAutoRotate}
                aria-pressed={autoRotate}
                aria-label={autoRotate ? 'Pause Earth rotation' : 'Rotate Earth manually'}
                title={
                  autoRotate
                    ? 'Pause Earth rotation'
                    : 'Rotate Earth (automatically turns on with Play 1980–2026)'
                }
                className={`p-2 rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  autoRotate
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onResetCamera}
                title="Reset camera angle"
                aria-label="Reset camera angle"
                className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenGuide}
                title="How Earth Jukebox Works"
                aria-label="How Earth Jukebox Works"
                className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
              >
                <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Row 2: 1980-2026 Timeline Scrubber, Calibrated Metric & Live Waveform */}
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={onToggleTimelapse}
                aria-pressed={isTimelapsePlaying}
                aria-label={isTimelapsePlaying ? 'Pause decade time-lapse' : 'Play decade time-lapse'}
                title="Play/Pause 1980–2026 time-lapse and Earth rotation (Shortcut T)"
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                  isTimelapsePlaying
                    ? 'border-amber-500/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                    : 'border-slate-700/80 bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
                }`}
              >
                {isTimelapsePlaying ? 'Pause Era' : 'Play 1980–2026'}
              </button>

              <div className="flex items-center gap-2.5 flex-1 min-w-[160px]">
                <span className="font-mono tabular-nums text-xs text-slate-500">{MIN_YEAR}</span>
                <input
                  type="range"
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  step={1}
                  value={year}
                  onChange={(e) => onChangeYear(parseInt(e.target.value, 10))}
                  aria-label="Select climate observation year"
                  className="observatory-slider w-full"
                />
                <span className="font-mono tabular-nums text-xs font-semibold text-slate-100 w-10 text-right">
                  {year}
                </span>
              </div>
            </div>

            {/* Scientific Readout, Color Ramp & Oscilloscope */}
            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="truncate max-w-[160px]">{spec.title}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-200 font-medium">
                    {metric.formatted}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">
                    {spec.legend.minLabel}
                  </span>
                  <div
                    aria-hidden="true"
                    className="h-1.5 w-20 rounded-full"
                    style={{ background: spec.legend.gradientCss }}
                  />
                  <span className="font-mono text-[11px] text-slate-500">
                    {spec.legend.maxLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
                <canvas
                  ref={waveCanvasRef}
                  width={96}
                  height={28}
                  aria-hidden="true"
                  className="rounded bg-slate-950/80 border border-slate-800/80"
                />
                <div className="hidden lg:block text-right">
                  <div className="font-mono tabular-nums text-[11px] text-slate-400">
                    Scan {lonDisplay}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {metric.deltaLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
