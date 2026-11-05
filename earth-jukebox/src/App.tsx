import { useEffect, useRef, useState } from "react";
import {
  Disc3,
  Keyboard,
  X,
  MousePointerClick,
  CircleDot,
  Accessibility,
  Satellite,
} from "lucide-react";
import Starfield from "./components/Starfield";
import Jukebox from "./components/Jukebox";
import Science from "./components/Science";
import ListeningGuide from "./components/ListeningGuide";

const SECTIONS = [
  { id: "jukebox", label: "THE JUKEBOX" },
  { id: "science", label: "THE METHOD" },
  { id: "guide", label: "THE GUIDE" },
];

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [active, setActive] = useState("jukebox");
  const [showHelp, setShowHelp] = useState(false);
  const helpCloseRef = useRef<HTMLButtonElement>(null);

  /* scrollspy — deterministic: last section whose top passed the 32% line */
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.scrollY + window.innerHeight * 0.32;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.offsetTop <= line) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* shortcuts: ? opens, Escape closes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (e.key === "Escape") {
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (showHelp) helpCloseRef.current?.focus();
  }, [showHelp]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className={`relative min-h-screen bg-abyss text-ink ${reducedMotion ? "reduce-motion" : ""}`}>
      <Starfield reducedMotion={reducedMotion} />
      {/* ambient nebula gradients */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-[-20%] h-[560px] w-[560px] rounded-full bg-cyan/[0.07] blur-[160px]" />
        <div className="absolute -right-40 top-[35%] h-[560px] w-[560px] rounded-full bg-amber-hot/[0.06] blur-[160px]" />
        <div className="absolute bottom-[-30%] left-[30%] h-[640px] w-[640px] rounded-full bg-[#3040ff]/[0.08] blur-[180px]" />
      </div>

      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-40 border-b border-cyan/10 bg-abyss/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1520px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }); }}
             className="group flex items-center gap-3" aria-label="Earth Jukebox — back to top">
            <svg viewBox="0 0 64 64" className="h-10 w-10 transition-transform duration-500 group-hover:rotate-[20deg]" aria-hidden="true">
              <circle cx="32" cy="32" r="28" fill="#0a0e1d" stroke="#4fd8ff" strokeWidth="2.5" />
              <ellipse cx="32" cy="32" rx="25" ry="9" fill="none" stroke="#ffb454" strokeWidth="1.6" opacity="0.9" transform="rotate(-24 32 32)" />
              <circle cx="32" cy="32" r="10" fill="none" stroke="#4fd8ff" strokeWidth="2" />
              <circle cx="32" cy="32" r="2.8" fill="#ffb454" />
            </svg>
            <span className="leading-tight">
              <span className="block font-display text-[1.05rem] font-bold tracking-[0.08em] text-white">
                EARTH&nbsp;JUKEBOX
              </span>
              <span className="block font-mono text-[0.5rem] uppercase tracking-[0.28em] text-cyan-dim">
                NASA EIC · Sonification
              </span>
            </span>
          </a>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                aria-current={active === s.id ? "true" : undefined}
                className={`rounded-full px-2.5 py-2 font-mono text-[0.55rem] tracking-[0.2em] transition-all sm:px-4 sm:text-[0.62rem] ${
                  active === s.id
                    ? "border border-cyan/40 bg-cyan/10 text-cyan shadow-[0_0_16px_rgba(79,216,255,0.25)]"
                    : "border border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => setShowHelp(true)}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              className="ml-1 rounded-full border border-edge2 p-2.5 text-ink-dim transition-colors hover:border-cyan/50 hover:text-cyan"
            >
              <Keyboard className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <main id="top" className="relative z-10 mx-auto max-w-[1520px] px-4 sm:px-6">
        {/* ============ HERO ============ */}
        <div className="flex flex-wrap items-end justify-between gap-6 pb-4 pt-5 sm:pt-8">
          <div className="max-w-3xl">
            <p className="flex flex-wrap items-center gap-3 font-mono text-[0.6rem] tracking-[0.4em] text-amber">
              <Satellite className="h-4 w-4" aria-hidden="true" />
              NASA EARTH INFORMATION CENTER · FOR THE EAR AS MUCH AS THE EYE
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl">
              The Earth,<br />
              <span className="sheen">translated into sound.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-ink-dim">
              Six live sonifications of NASA's changing-planet visualizations — every note you hear is
              computed from the pixels under the scanning beam. No audio files were harmed (or used) in
              the making of this record.
            </p>
          </div>
          <dl className="flex flex-wrap gap-6 pb-1 font-mono">
            {[
              ["06", "records"],
              ["14,400", "pixels / performance"],
              ["00", "audio samples"],
            ].map(([n, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-3xl font-semibold text-cyan text-glow-cyan">{n}</dd>
                <dd className="mt-1 max-w-[110px] text-[0.55rem] uppercase leading-snug tracking-[0.2em] text-ink-dim">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Jukebox />

        <div className="h-20" />
        <Science />

        <div className="h-20" />
        <ListeningGuide reducedMotion={reducedMotion} onToggleReducedMotion={() => setReducedMotion((v) => !v)} />

        <div className="h-16" />
      </main>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-cyan/10 bg-[#04060d]/90">
        <div className="mx-auto grid max-w-[1520px] gap-8 px-6 py-10 text-[0.8rem] text-ink-dim md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.3em] text-cyan">
              <Disc3 className="h-4 w-4" aria-hidden="true" /> EARTH JUKEBOX
            </p>
            <p className="mt-3 leading-relaxed">
              A multi-sensory instrument for NASA's Earth Information Center — built in the spirit of
              the open hackathon brief: make complex Earth science legible to every pair of ears.
              Frames are AI-rendered homages to EIC visualizations; the science they depict is real and
              cited.
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.65rem] tracking-[0.3em] text-cyan">DATA PROVENANCE</p>
            <ul className="mt-3 space-y-1 leading-relaxed">
              <li>NASA GISS GISTEMP — temperature anomalies</li>
              <li>Suomi NPP VIIRS — Black Marble night lights</li>
              <li>MODIS Aqua — ocean color & surface currents</li>
              <li>NSIDC / NASA Goddard — Arctic sea-ice index</li>
              <li>NASA FIRMS — thermal hotspots & aerosols</li>
              <li>NASA GEOS-FP — carbon dioxide transport run</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[0.65rem] tracking-[0.3em] text-cyan">BUILT WITH</p>
            <p className="mt-3 leading-relaxed">
              Web Audio API synthesis · Canvas 2D pixel analysis · React + Tailwind. No servers, no
              accounts, no samples — the entire orchestra runs in your browser tab.
            </p>
            <p className="mt-3 flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-amber">
              <CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> Independent community project — not affiliated with or endorsed by NASA
            </p>
          </div>
        </div>
        <div className="border-t border-edge/60">
          <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-3 px-6 py-4 font-mono text-[0.55rem] uppercase tracking-[0.25em] text-ink-dim">
            <span>Earth Jukebox · for the NASA EIC Sonification Challenge</span>
            <span className="flex items-center gap-2">
              <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" /> Click the frame to ping its pixels
              <span aria-hidden="true" className="text-edge2">|</span>
              <Accessibility className="h-3.5 w-3.5" aria-hidden="true" /> Fully keyboard playable
            </span>
          </div>
        </div>
      </footer>

      {/* ============ SHORTCUTS MODAL ============ */}
      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
            aria-label="Close shortcuts"
            onClick={() => setShowHelp(false)}
          />
          <div className="panel relative w-full max-w-md p-6">
            <div className="flex items-center justify-between">
              <h2 id="shortcuts-title" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Keyboard className="h-5 w-5 text-cyan" aria-hidden="true" /> Keyboard Deck
              </h2>
              <button
                ref={helpCloseRef}
                onClick={() => setShowHelp(false)}
                aria-label="Close"
                className="rounded-full border border-edge2 p-2 text-ink-dim transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-4 space-y-2.5 text-[0.85rem]">
              {[
                ["Space", "Play / pause"],
                ["1 – 6", "Choose record"],
                ["← / →", "Previous / next record"],
                ["M", "Mute master bus"],
                ["G", "Toggle GROOVE (drums)"],
                ["B", "Toggle beam sweep"],
                ["?", "Toggle this panel"],
                ["Esc", "Close"],
              ].map(([k, action]) => (
                <li key={k} className="flex items-center justify-between gap-4 border-b border-edge/60 pb-2">
                  <span className="text-ink-dim">{action}</span>
                  <kbd className="rounded-md border border-edge2 bg-panel2 px-2.5 py-1 font-mono text-[0.75rem] text-cyan">
                    {k}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
