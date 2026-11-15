import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CLIMATE_LAYERS, CLIMATE_LAYER_ORDER } from '../data/climateLayers';

interface SonificationGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export function SonificationGuideModal({ open, onClose }: SonificationGuideModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[86vh] overflow-y-auto rounded-xl border border-slate-800 bg-[#0B0F19] p-6 sm:p-8 text-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2
              id="guide-modal-title"
              className="font-display text-xl font-semibold text-slate-50"
            >
              How Sight Becomes Sound
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Multi-sensory Earth science translation built for the 2026 NASA Space Apps Challenge.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg border border-slate-800 bg-slate-900/80 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm leading-relaxed">
          <section>
            <h3 className="font-display text-base font-semibold text-slate-100">
              01. Real-Time Visual Frame Analysis
            </h3>
            <p className="mt-1.5 text-slate-300">
              As the 3D globe turns on its 23.4° axis, an orbital scan meridian reads live RGB pixel
              intensity and spatial contrast directly from the active climate overlay texture.
              Those visual readings drive a dual-mode Web Audio synthesizer in real time.
            </p>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="font-display font-semibold text-sky-300">
                Ambient Musical Mode
              </h4>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Balances scientific fidelity with calm musicality. Cooler baselines sustain open
                Lydian harmonies, while warming anomalies shift harmonic tension and trigger
                pentatonic chimes across regional hotspots.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <h4 className="font-display font-semibold text-amber-300">
                Live Pixel Scan Mode
              </h4>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Sweeps 8 latitude bands from North Pole to South Pole. Color warmth maps to
                quantized pitch frequency, pixel density sets pulse cadence, and hemisphere peaks
                shape stereo panning.
              </p>
            </div>
          </section>

          <section>
            <h3 className="font-display text-base font-semibold text-slate-100">
              02. Climate Layers &amp; Sound Mapping
            </h3>
            <div className="mt-3 divide-y divide-slate-800/80 border border-slate-800 rounded-lg">
              {CLIMATE_LAYER_ORDER.map((id) => {
                const layer = CLIMATE_LAYERS[id];
                return (
                  <div key={id} className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-100">{layer.title}</span>
                      <span className="font-mono text-xs text-slate-400">
                        {layer.datasetSource}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{layer.audioMappingNote}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="font-display text-base font-semibold text-slate-100">
              03. AI Climate Voice Guide &amp; Accessibility
            </h3>
            <p className="mt-1.5 text-xs text-slate-400">
              Click any country or ocean on the 3D Earth to hear the AI Climate Scientist explain
              the exact location, year, and reading in English, French, or Arabic. Use the Mute
              Agent button at the top-right (or press A) to silence the voice guide independently
              from the Earth soundscape.
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Play / Pause Audio</span>
                <kbd className="font-mono text-slate-100">Space</kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Climate Layer</span>
                <kbd className="font-mono text-slate-100">1 – 4</kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Audio Mode</span>
                <kbd className="font-mono text-slate-100">M</kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Mute / Unmute Agent</span>
                <kbd className="font-mono text-slate-100">A</kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Scrub Year</span>
                <kbd className="font-mono text-slate-100">← / →</kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Time-Lapse &amp; Spin</span>
                <kbd className="font-mono text-slate-100">T</kbd>
              </div>
              <div className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                <span className="text-slate-400">Zen Mode</span>
                <kbd className="font-mono text-slate-100">H</kbd>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
