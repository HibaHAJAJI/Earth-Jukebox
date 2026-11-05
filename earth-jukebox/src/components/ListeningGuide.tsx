import {
  Ear,
  Keyboard,
  Type,
  Contrast,
  Megaphone,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";
import { TRACKS } from "../data/tracks";

interface GuideProps {
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
}

const KEYS: [string, string][] = [
  ["Space", "Play / pause the record"],
  ["1 – 6", "Drop straight to record 1–6"],
  ["←  /  →", "Previous / next record"],
  ["M", "Mute or unmute the master bus"],
  ["G", "Toggle the GROOVE engine (drums & bass)"],
  ["B", "Toggle the beam sweep (calm the visuals)"],
];

export default function ListeningGuide({ reducedMotion, onToggleReducedMotion }: GuideProps) {
  return (
    <section id="guide" aria-label="Listening guide and accessibility" className="scroll-mt-28">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-edge pb-6">
        <div className="max-w-2xl">
          <p className="font-mono text-[0.62rem] tracking-[0.4em] text-cyan">THE LISTENING GUIDE</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-5xl">
            Built <span className="sheen">blind-first</span>,<br />loved by everyone.
          </h2>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-dim">
            Earth Jukebox was designed so the primary interface is your ears. The following is
            everything a blind or low-vision listener needs — and everything a sighted one might
            enjoy knowing.
          </p>
        </div>
        <button
          onClick={onToggleReducedMotion}
          role="switch"
          aria-checked={reducedMotion}
          className={`flex items-center gap-3 rounded-2xl border px-5 py-4 font-mono text-[0.65rem] tracking-[0.22em] transition-all ${
            reducedMotion
              ? "border-amber/50 bg-amber/10 text-amber shadow-[0_0_24px_rgba(255,180,84,0.2)]"
              : "border-edge2 text-ink-dim hover:text-ink"
          }`}
        >
          {reducedMotion ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
          <span className="text-left">
            REDUCED MOTION
            <span className="block text-[0.5rem] normal-case tracking-normal text-ink-dim">
              {reducedMotion ? "on — beam & twinkle stilled" : "off — full visual sweep"}
            </span>
          </span>
        </button>
      </div>

      {/* four pillars */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Ear, title: "Ear-first", body: "Every control has a spoken or tonal consequence. Audio never accompanies information — it carries it." },
          { icon: Keyboard, title: "Keyboard deck", body: "The whole jukebox is operable from six keys. No mouse, no sight, no problem — tab order is linear and announced." },
          { icon: Type, title: "Words with weight", body: "Every frame ships with a plain-language science brief and per-track listening cues — the same text your screen reader speaks." },
          { icon: Contrast, title: "Honest contrast", body: "Ink on abyss exceeds WCAG AA (≥ 7:1 for body text). Focus rings are 3px luminous cyan — never removed, never subtle." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="panel p-5">
            <Icon className="h-5 w-5 text-cyan" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-semibold text-white">{title}</h3>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-dim">{body}</p>
          </div>
        ))}
      </div>

      {/* keyboard deck table */}
      <div className="panel mt-6 overflow-hidden">
        <div className="border-b border-cyan/10 px-6 py-4">
          <h3 className="flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.35em] text-cyan">
            <Keyboard className="h-4 w-4" aria-hidden="true" /> THE KEYBOARD DECK
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[0.85rem]">
            <caption className="sr-only">Keyboard shortcuts for the Earth Jukebox</caption>
            <thead>
              <tr className="border-b border-edge font-mono text-[0.55rem] uppercase tracking-[0.25em] text-ink-dim">
                <th scope="col" className="px-6 py-3 text-left">Key</th>
                <th scope="col" className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {KEYS.map(([k, action], i) => (
                <tr key={k} className={i % 2 ? "bg-white/[0.025]" : ""}>
                  <td className="px-6 py-3">
                    <kbd className="rounded-md border border-edge2 bg-panel2 px-2.5 py-1 font-mono text-[0.75rem] text-cyan shadow-[0_2px_0_#1b2340]">
                      {k}
                    </kbd>
                  </td>
                  <td className="px-6 py-3 text-ink-dim">{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* narration & live region explainer */}
      <div className="panel mt-6 grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber/40 bg-amber/10">
          <Megaphone className="h-7 w-7 text-amber" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-white">The jukebox narrates itself</h3>
          <p className="mt-1.5 max-w-3xl text-[0.86rem] leading-relaxed text-ink-dim">
            A visually-hidden <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[0.75rem] text-cyan">aria-live="polite"</code>{" "}
            region announces every track change, play and pause. The{" "}
            <strong className="text-amber">HEAR THE STORY</strong> button on each record uses your
            device's speech synthesizer to read the frame's full narration — what the dataset is, what
            the notes are doing, why it matters. No account, no network, no sighted guide required.
          </p>
        </div>
      </div>

      {/* per-track programs */}
      <h3 className="mt-8 flex items-center gap-2 font-mono text-[0.65rem] tracking-[0.35em] text-cyan">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> SIX LISTENING PROGRAMS
      </h3>
      <p className="mt-2 max-w-2xl text-[0.85rem] text-ink-dim">
        Each record below is both a dataset and a composition. Read the cue, press play, and let the
        frame draw itself in your inner ear.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {TRACKS.map((t, i) => (
          <article key={t.id} className="panel flex flex-col p-5">
            <div className="flex items-baseline justify-between gap-3 border-b border-edge pb-3">
              <h4 className="font-display text-base font-semibold text-white">
                <span className="mr-2 font-mono text-[0.65rem] text-amber align-middle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t.title}
              </h4>
              <span className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-cyan-dim">{t.era}</span>
            </div>
            <p className="mt-3 text-[0.78rem] italic leading-relaxed text-ink">“{t.narration}”</p>
            <ul className="mt-3 space-y-1.5 text-[0.78rem] leading-relaxed text-ink-dim">
              {t.listening.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden="true" className="text-cyan">◦</span>
                  {l}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-6 text-center font-mono text-[0.55rem] uppercase tracking-[0.25em] text-ink-dim">
        Tested heuristically against WCAG 2.2 AA — focus visibility, name/role/value, status messages,
        motion preference · A formal audit is the next milestone, not a marketing claim
      </p>
    </section>
  );
}
