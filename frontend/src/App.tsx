import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { EarthViewport } from './components/EarthViewport';
import { ObservatoryHeader } from './components/ObservatoryHeader';
import { SonificationGuideModal } from './components/SonificationGuideModal';
import {
  AudioMode,
  CLIMATE_LAYERS,
  CLIMATE_LAYER_ORDER,
  ClimateLayerId,
  MAX_YEAR,
  MIN_YEAR,
  ProbedLocation,
} from './data/climateLayers';
import {
  AgentAudioPlayer,
  AgentLanguage,
  requestLocationExplanation,
} from './engine/agentVoiceClient';
import {
  EarthSonificationEngine,
  MeridianTelemetry,
} from './engine/sonificationEngine';

export default function App() {
  const [activeLayer, setActiveLayer] = useState<ClimateLayerId>('temperature');
  const [year, setYear] = useState<number>(2024);
  const [isTimelapsePlaying, setIsTimelapsePlaying] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<AudioMode>('ambient');
  const [volume, setVolume] = useState<number>(0.65);
  const [agentMuted, setAgentMuted] = useState<boolean>(false);
  const [agentLanguage, setAgentLanguage] = useState<AgentLanguage>('en');
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'speaking'>('idle');
  const [agentCaption, setAgentCaption] = useState<string>('');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [guideOpen, setGuideOpen] = useState<boolean>(false);
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);
  const [scanLonDeg, setScanLonDeg] = useState<number>(0);
  const [probedLocation, setProbedLocation] = useState<ProbedLocation | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const engine = useMemo(() => new EarthSonificationEngine(), []);
  const agentPlayer = useMemo(() => new AgentAudioPlayer(), []);

  const yearRef = useRef(year);
  yearRef.current = year;

  const activeLayerRef = useRef(activeLayer);
  activeLayerRef.current = activeLayer;

  const agentMutedRef = useRef(agentMuted);
  agentMutedRef.current = agentMuted;

  const agentLanguageRef = useRef(agentLanguage);
  agentLanguageRef.current = agentLanguage;

  const probeSeqRef = useRef(0);
  const probeAbortRef = useRef<AbortController | null>(null);

  const stopAgentActivity = useCallback(() => {
    probeAbortRef.current?.abort();
    probeAbortRef.current = null;
    agentPlayer.stop();
    engine.setAgentDucking(false);
    setAgentStatus('idle');
  }, [agentPlayer, engine]);

  // Clean up audio, agent speech & requests on unmount
  useEffect(() => {
    return () => {
      probeAbortRef.current?.abort();
      agentPlayer.stop();
      engine.dispose();
    };
  }, [agentPlayer, engine]);

  // Core explain + speak runner for a probed globe location
  const runAgentForLocation = useCallback(
    async (probe: ProbedLocation, layerId: ClimateLayerId, targetYear: number, lang: AgentLanguage) => {
      probeAbortRef.current?.abort();
      agentPlayer.stop();
      engine.setAgentDucking(false);

      const controller = new AbortController();
      probeAbortRef.current = controller;
      const seq = ++probeSeqRef.current;

      setAgentStatus('thinking');
      setAgentCaption('');

      try {
        const explanation = await requestLocationExplanation(
          {
            placeName: probe.regionName,
            lat: probe.lat,
            lon: probe.lon,
            layerId,
            year: targetYear,
            formattedValue: probe.formattedValue,
            language: lang,
          },
          controller.signal
        );

        if (controller.signal.aborted || seq !== probeSeqRef.current) return;

        setAgentCaption(explanation);
        setLiveAnnouncement(explanation);

        if (agentMutedRef.current) {
          setAgentStatus('idle');
          return;
        }

        await agentPlayer.speak(explanation, lang, controller.signal, {
          onAudioStart: () => {
            if (seq !== probeSeqRef.current || agentMutedRef.current) return;
            engine.setAgentDucking(true);
            setAgentStatus('speaking');
          },
          onAudioEnd: () => {
            engine.setAgentDucking(false);
            if (seq === probeSeqRef.current) {
              setAgentStatus('idle');
            }
          },
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        engine.setAgentDucking(false);
        if (seq === probeSeqRef.current) {
          setAgentStatus('idle');
        }
      }
    },
    [agentPlayer, engine]
  );

  // Sync Earth music play/pause
  const handleToggleAudio = useCallback(() => {
    setIsPlayingAudio((prev) => {
      const next = !prev;
      void engine.setPlaying(next);
      const msg = next
        ? `Audio sonification started in ${audioMode === 'ambient' ? 'Ambient Musical' : 'Live Pixel Scan'} mode.`
        : 'Audio sonification paused.';
      setLiveAnnouncement(msg);
      return next;
    });
  }, [engine, audioMode]);

  const handleChangeAudioMode = useCallback(
    (mode: AudioMode) => {
      setAudioMode(mode);
      engine.setMode(mode);
      const msg =
        mode === 'ambient'
          ? 'Switched to Ambient Musical soundscape.'
          : 'Switched to Live Pixel Scan data synthesizer.';
      setLiveAnnouncement(msg);
    },
    [engine]
  );

  const handleChangeVolume = useCallback(
    (vol: number) => {
      setVolume(vol);
      engine.setVolume(vol);
    },
    [engine]
  );

  const handleSelectLayer = useCallback(
    (layerId: ClimateLayerId) => {
      setActiveLayer(layerId);
      setProbedLocation(null);
      setAgentCaption('');
      stopAgentActivity();
      engine.setLayer(layerId);

      const spec = CLIMATE_LAYERS[layerId];
      const metric = spec.globalMetricAtYear(yearRef.current);
      const summary = `${spec.title}, ${yearRef.current}: global average ${metric.formatted}. ${spec.description}`;
      setLiveAnnouncement(summary);
    },
    [engine, stopAgentActivity]
  );

  const handleChangeYear = useCallback(
    (nextYear: number) => {
      const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, nextYear));
      setYear(clamped);
      const spec = CLIMATE_LAYERS[activeLayerRef.current];
      const metric = spec.globalMetricAtYear(clamped);
      setLiveAnnouncement(`${spec.title} in ${clamped}: ${metric.formatted}`);
    },
    []
  );

  // Dedicated independent Agent Mute toggle (top bar + shortcut A)
  const handleToggleAgentMute = useCallback(() => {
    setAgentMuted((prev) => {
      const next = !prev;
      agentMutedRef.current = next;
      if (next) {
        stopAgentActivity();
        setLiveAnnouncement('AI Voice Agent muted. Earth music remains unaffected.');
      } else {
        setLiveAnnouncement('AI Voice Agent unmuted.');
      }
      return next;
    });
  }, [stopAgentActivity]);

  // Switchable EN / FR / AR language selector
  const handleChangeAgentLanguage = useCallback(
    (lang: AgentLanguage) => {
      setAgentLanguage(lang);
      agentLanguageRef.current = lang;
      if (probedLocation) {
        void runAgentForLocation(
          probedLocation,
          activeLayerRef.current,
          yearRef.current,
          lang
        );
      }
    },
    [probedLocation, runAgentForLocation]
  );

  // Replay current explanation speech
  const handleReplayAgent = useCallback(() => {
    if (!agentCaption || agentMutedRef.current) return;
    probeAbortRef.current?.abort();
    const controller = new AbortController();
    probeAbortRef.current = controller;
    const seq = ++probeSeqRef.current;

    void agentPlayer.speak(agentCaption, agentLanguageRef.current, controller.signal, {
      onAudioStart: () => {
        if (seq !== probeSeqRef.current || agentMutedRef.current) return;
        engine.setAgentDucking(true);
        setAgentStatus('speaking');
      },
      onAudioEnd: () => {
        engine.setAgentDucking(false);
        if (seq === probeSeqRef.current) {
          setAgentStatus('idle');
        }
      },
    });
  }, [agentCaption, agentPlayer, engine]);

  const handleProbeLocation = useCallback(
    (probe: ProbedLocation) => {
      setProbedLocation(probe);
      void engine.playProbeChime(probe.normalizedValue, probe.lat);
      void runAgentForLocation(
        probe,
        activeLayerRef.current,
        yearRef.current,
        agentLanguageRef.current
      );
    },
    [engine, runAgentForLocation]
  );

  const handleClearProbe = useCallback(() => {
    setProbedLocation(null);
    setAgentCaption('');
    stopAgentActivity();
  }, [stopAgentActivity]);

  const handleScanUpdate = useCallback(
    (lonDeg: number, telemetry: MeridianTelemetry) => {
      setScanLonDeg(lonDeg);
      const yearProgress = (yearRef.current - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
      engine.updateTelemetry(telemetry, yearProgress);
    },
    [engine]
  );

  const handleToggleTimelapse = useCallback(() => {
    setIsTimelapsePlaying((prev) => {
      const next = !prev;
      setAutoRotate(next);
      const msg = next
        ? 'Time-lapse started. Earth rotation and decade timeline active.'
        : 'Time-lapse paused. Earth rotation stopped.';
      setLiveAnnouncement(msg);
      return next;
    });
  }, []);

  // Decade time-lapse interval
  useEffect(() => {
    if (!isTimelapsePlaying) return;
    const timer = window.setInterval(() => {
      setYear((prev) => (prev >= MAX_YEAR ? MIN_YEAR : prev + 1));
    }, 650);
    return () => window.clearInterval(timer);
  }, [isTimelapsePlaying]);

  // Global keyboard shortcuts for effortless navigation & accessibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (guideOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key !== 'Escape') return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleAudio();
      } else if (e.key === '1') {
        handleSelectLayer(CLIMATE_LAYER_ORDER[0]);
      } else if (e.key === '2') {
        handleSelectLayer(CLIMATE_LAYER_ORDER[1]);
      } else if (e.key === '3') {
        handleSelectLayer(CLIMATE_LAYER_ORDER[2]);
      } else if (e.key === '4') {
        handleSelectLayer(CLIMATE_LAYER_ORDER[3]);
      } else if (e.key === 'm' || e.key === 'M') {
        handleChangeAudioMode(audioMode === 'ambient' ? 'pixelScan' : 'ambient');
      } else if (e.key === 'a' || e.key === 'A') {
        handleToggleAgentMute();
      } else if (e.key === 'h' || e.key === 'H') {
        setZenMode((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        handleToggleTimelapse();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleChangeYear(yearRef.current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleChangeYear(yearRef.current - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    guideOpen,
    audioMode,
    handleToggleAudio,
    handleSelectLayer,
    handleChangeAudioMode,
    handleToggleAgentMute,
    handleToggleTimelapse,
    handleChangeYear,
  ]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#07090E] text-slate-100">
      {/* Screen-reader live region for climate & probe updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Top Observatory Navigation with Always-Reachable Mute Agent Control */}
      <ObservatoryHeader
        activeLayer={activeLayer}
        onSelectLayer={handleSelectLayer}
        agentMuted={agentMuted}
        agentStatus={agentStatus}
        onToggleAgentMute={handleToggleAgentMute}
        zenMode={zenMode}
      />

      {/* Full-Viewport 3D Earth Stage */}
      <main className="w-full h-full">
        <EarthViewport
          activeLayer={activeLayer}
          year={year}
          isPlayingAudio={isPlayingAudio}
          autoRotate={autoRotate}
          cameraResetTrigger={cameraResetTrigger}
          probedLocation={probedLocation}
          onProbeLocation={handleProbeLocation}
          onScanUpdate={handleScanUpdate}
        />
      </main>

      {/* Collapsible Unified Bottom Control Dock */}
      <ControlDock
        activeLayer={activeLayer}
        onSelectLayer={handleSelectLayer}
        year={year}
        onChangeYear={handleChangeYear}
        isTimelapsePlaying={isTimelapsePlaying}
        onToggleTimelapse={handleToggleTimelapse}
        isPlayingAudio={isPlayingAudio}
        onToggleAudio={handleToggleAudio}
        audioMode={audioMode}
        onChangeAudioMode={handleChangeAudioMode}
        volume={volume}
        onChangeVolume={handleChangeVolume}
        agentLanguage={agentLanguage}
        onChangeAgentLanguage={handleChangeAgentLanguage}
        agentMuted={agentMuted}
        agentStatus={agentStatus}
        agentCaption={agentCaption}
        onReplayAgent={handleReplayAgent}
        onOpenGuide={() => setGuideOpen(true)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((r) => !r)}
        onResetCamera={() => setCameraResetTrigger((c) => c + 1)}
        scanLonDeg={scanLonDeg}
        probedLocation={probedLocation}
        onClearProbe={handleClearProbe}
        zenMode={zenMode}
        onToggleZenMode={() => setZenMode((z) => !z)}
        engine={engine}
      />

      {/* Story, Methodology & Keyboard Guide Modal */}
      <SonificationGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
