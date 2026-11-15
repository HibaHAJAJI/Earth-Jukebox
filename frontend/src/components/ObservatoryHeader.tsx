import { Volume2, VolumeX } from 'lucide-react';
import { CLIMATE_LAYERS, CLIMATE_LAYER_ORDER, ClimateLayerId } from '../data/climateLayers';

interface ObservatoryHeaderProps {
  activeLayer: ClimateLayerId;
  onSelectLayer: (layer: ClimateLayerId) => void;
  agentMuted: boolean;
  agentStatus: 'idle' | 'thinking' | 'speaking';
  onToggleAgentMute: () => void;
  zenMode: boolean;
}

export function ObservatoryHeader({
  activeLayer,
  onSelectLayer,
  agentMuted,
  agentStatus,
  onToggleAgentMute,
  zenMode,
}: ObservatoryHeaderProps) {
  const renderMuteAgentButton = () => (
    <button
      type="button"
      onClick={onToggleAgentMute}
      aria-pressed={agentMuted}
      title={
        agentMuted
          ? 'Unmute AI Voice Agent (Shortcut A)'
          : 'Mute AI Voice Agent without stopping Earth music (Shortcut A)'
      }
      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-2 ${
        agentMuted
          ? 'bg-rose-500/15 border-rose-500/45 text-rose-200 hover:bg-rose-500/25'
          : agentStatus === 'speaking'
          ? 'bg-sky-500/20 border-sky-400/60 text-sky-100 hover:bg-sky-500/30'
          : 'bg-slate-800/90 border-slate-700/80 text-slate-100 hover:bg-slate-700/90'
      }`}
    >
      {agentMuted ? (
        <VolumeX className="w-3.5 h-3.5 text-rose-300 shrink-0" aria-hidden="true" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-sky-300 shrink-0" aria-hidden="true" />
      )}
      <span>
        {agentMuted
          ? 'Agent Muted'
          : agentStatus === 'speaking'
          ? 'Mute Agent (Speaking)'
          : 'Mute Agent'}
      </span>
    </button>
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-20 flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-[#07090E]/88 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          zenMode ? '-translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      >
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="font-display text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-4 rounded"
        >
          Earth Jukebox
        </a>

        {/* Zone 2: 4 concise single-line climate layer links */}
        <nav
          aria-label="Climate visualization layers"
          className="hidden md:flex items-center gap-7"
        >
          {CLIMATE_LAYER_ORDER.map((id, index) => {
            const spec = CLIMATE_LAYERS[id];
            const isActive = activeLayer === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectLayer(id)}
                aria-current={isActive ? 'page' : undefined}
                title={`Switch to ${spec.title} (Shortcut ${index + 1})`}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-4 rounded ${
                  isActive
                    ? 'text-slate-50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spec.shortLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[15px] h-[2px] bg-sky-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Dedicated always-reachable Mute Agent control */}
        <div className="flex items-center shrink-0">{renderMuteAgentButton()}</div>
      </header>

      {/* Keep Mute Agent button pinned at top-right even in Zen Mode */}
      {zenMode && (
        <div className="fixed top-3.5 right-6 z-30">{renderMuteAgentButton()}</div>
      )}
    </>
  );
}
