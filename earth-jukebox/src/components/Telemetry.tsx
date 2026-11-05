import RadialEq from "./RadialEq";
import { NOTE_NAMES, pcName, type Features } from "../audio/analysis";
import type { Readout } from "../audio/engine";

interface TelemetryProps {
  features: Features | null;
  bpm: number;
  readout: Readout;
  playing: boolean;
  accent: string;
}

const REGION_LABEL = ["WEST", "MID-WEST", "MID-EAST", "EAST"];

export default function Telemetry({ features, bpm, readout, playing, accent }: TelemetryProps) {
  const brightness = features ? Math.round(features.brightness * 100) : null;
  const chroma = features ? Math.round(features.saturation * 100) : null;
  const contrast = features ? Math.round(features.contrast * 100) : null;
  const warmth = features ? features.warmth : null;
  const warmthLabel = warmth === null ? "—" : warmth > 0.18 ? "HOT" : warmth < -0.18 ? "COLD" : "TEMPERATE";
  const keyLabel = features ? `${pcName(features.rootPc)} ${features.mode === "minor" ? "minor" : "major"}` : "—";
  const domHue = features ? Math.round(features.avgHue) : null;

  return (
    <aside aria-label="Sonification telemetry" className="flex flex-col gap-4">
      {/* panel title */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[0.62rem] tracking-[0.35em] text-cyan/80">SPECTRAL TELEMETRY</h2>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${playing ? "bg-emerald-400 led-on" : "bg-zinc-600"}`}
          />
          <span className="font-mono text-[0.58rem] tracking-widest text-ink-dim">
            {playing ? "LIVE" : "IDLE"}
          </span>
        </div>
      </div>

      {/* radial spectrum */}
      <div className="panel-inset relative h-44 w-full overflow-hidden">
        <RadialEq playing={playing} accent={accent} />
        <span className="pointer-events-none absolute left-3 top-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.3em] text-cyan/70 backdrop-blur-[2px]">
          FIG.2 — FOURIER ROUND
        </span>
      </div>

      {/* hue histogram → 12 pitch classes */}
      <div className="panel-inset p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="font-mono text-[0.55rem] tracking-[0.3em] text-cyan/50">FIG.1 — HUE→PITCH MAP</h3>
          <span className="font-mono text-[0.55rem] text-ink-dim">
            {domHue !== null ? `DOMINANT ${domHue}°` : "CALIBRATING…"}
          </span>
        </div>
        <div
          className="flex h-20 items-end gap-1"
          role="img"
          aria-label={
            features
              ? `Hue energy by semitone. Peak band ${pcName(features.rootPc)}, used as the tonic.`
              : "Hue histogram loading"
          }
        >
          {NOTE_NAMES.map((n, i) => {
            const v = features ? features.hist[i] : 0;
            const isRoot = features?.rootPc === i;
            return (
              <div key={n} className="flex flex-1 flex-col items-center gap-1" title={`${n} band`}>
                <div className="flex h-14 w-full items-end overflow-hidden rounded-sm bg-black/40">
                  <div
                    className={`w-full rounded-sm transition-all duration-700 ${isRoot ? "ring-2 ring-white/70" : ""}`}
                    style={{
                      height: `${Math.max(4, v * 100)}%`,
                      background: `hsl(${i * 30}, 82%, ${isRoot ? 68 : 52}%)`,
                      boxShadow: v > 0.55 ? `0 0 10px hsla(${i * 30}, 90%, 60%, 0.8)` : "none",
                    }}
                  />
                </div>
                <span className={`font-mono text-[0.5rem] ${isRoot ? "text-white" : "text-ink-dim"}`}>{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* stat grid */}
      <div className="grid grid-cols-2 gap-2 font-mono">
        {[
          { k: "TONIC / MODE", v: keyLabel },
          { k: "TEMPO", v: `${bpm} BPM` },
          { k: "LIGHTNESS", v: brightness === null ? "—" : `${brightness}%` },
          { k: "CHROMA", v: chroma === null ? "—" : `${chroma}%` },
          { k: "CONTRAST Δ", v: contrast === null ? "—" : `${contrast}%` },
          { k: "THERMAL", v: warmthLabel },
        ].map(({ k, v }) => (
          <div key={k} className="panel-inset px-3 py-2">
            <div className="text-[0.5rem] tracking-[0.22em] text-ink-dim">{k}</div>
            <div className="mt-0.5 text-[0.78rem] font-semibold text-ink">{v}</div>
          </div>
        ))}
      </div>

      {/* live melodic readout */}
      <div className="panel-inset flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="font-mono text-[0.5rem] tracking-[0.25em] text-ink-dim">BEAM REGION</div>
          <div className="font-mono text-sm text-cyan">{REGION_LABEL[readout.region] ?? "—"}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[0.5rem] tracking-[0.25em] text-ink-dim">FIELD</div>
          <div className="font-mono text-sm text-amber">{readout.chord}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[0.5rem] tracking-[0.25em] text-ink-dim">NOTE</div>
          <div className="font-mono text-sm text-ink">{readout.melody ?? "rest"}</div>
        </div>
      </div>
    </aside>
  );
}
