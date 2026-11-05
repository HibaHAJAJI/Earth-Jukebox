import {
  ScanLine,
  Grid3x3,
  SlidersHorizontal,
  AudioWaveform,
  Eye,
  Ear,
  HeartPulse,
  ChevronRight,
} from "lucide-react";

const PIPELINE = [
  {
    icon: ScanLine,
    step: "01",
    title: "Frame",
    body: "The EIC visual frame is drawn into a 160 × 90 analysis grid — 14,400 pixel samples per performance, re-read live every time the beam crosses them.",
  },
  {
    icon: Grid3x3,
    step: "02",
    title: "Features",
    body: "Each column of pixels is reduced to hue, saturation and lightness via RGB→HSL, plus a circular hue histogram (12 semitone bands) and lightness variance.",
  },
  {
    icon: SlidersHorizontal,
    step: "03",
    title: "Translation",
    body: "A ruleset snaps raw chroma into a pentatonic field, picks the tonic from the dominant hue band, derives triads per horizontal region, and clamps dynamics to musical contour.",
  },
  {
    icon: AudioWaveform,
    step: "04",
    title: "Performance",
    body: "The Web Audio graph — dual-detuned pads, thumbed sub-bass, struck-triangle bells, synthesized drums — renders the score at 16th-note resolution, spatially scanned left to right.",
  },
];

const TABLE: [string, string, string][] = [
  ["Horizontal position", "Time — the frame is read left → right over one beam sweep", "Phrasing, form & the shape of the performance"],
  ["Hue · 0–360°", "12 energy bands (30° each), wrap-smoothed", "Scale degrees; dominant band becomes the tonic"],
  ["Lightness · 0–1", "Column mean luminance, γ-curved", "Register — melodic contour rises and falls with the data"],
  ["Saturation · 0–1", "Chroma of each column", "Velocity & shimmer — saturated pixels play louder and bloom an octave up"],
  ["Regional hue (4 zones)", "Weighted hue vote per quarter of the frame", "Pad triads: harmony travels with the beam — the map modulates"],
  ["Contrast · σ(lightness)", "Column-to-column luminance variance", "Composed tempo (60–104 BPM) & rhythmic density"],
  ["Warm/cool ratio · r−b", "Global red-vs-blue energy balance", "Timbral brightness — lowpass cutoff 300 → 2250 Hz"],
  ["Near-black pixels", "Lightness under 5%", "Rests — silence is data too (the empty Arctic; the unlit ocean)"],
];

export default function Science() {
  return (
    <section id="science" aria-label="How the machine hears — sonification method" className="scroll-mt-28">
      {/* banner */}
      <div className="panel relative overflow-hidden">
        <img
          src="/images/earth-hero.jpg"
          alt="Planet Earth from orbit, city lights on the night side, with a faint holographic data grid tracing its longitude lines"
          className="absolute inset-0 h-full w-full object-cover object-[70%_35%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070f] via-[#05070f]/72 to-transparent" />
        <div className="relative max-w-2xl px-6 py-14 sm:px-10 sm:py-20">
          <p className="font-mono text-[0.62rem] tracking-[0.4em] text-cyan">THE METHOD</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl">
            How the machine<br />
            <span className="sheen">hears the Earth.</span>
          </h2>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-ink">
            Every glowing pixel in a NASA visualization is a number someone worked years to produce.
            Earth Jukebox treats that number as a note — and the whole frame as a score waiting to be
            performed. Here is the complete, honest translation table.
          </p>
          <a
            href="#jukebox"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-5 py-2.5 font-mono text-[0.62rem] tracking-[0.25em] text-cyan transition-colors hover:bg-cyan/20"
          >
            GO LISTEN <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* pipeline */}
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Sonification pipeline">
        {PIPELINE.map(({ icon: Icon, step, title, body }) => (
          <li key={step} className="panel group relative overflow-hidden p-5">
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-4 font-display text-7xl font-bold text-white/[0.045] transition-colors duration-500 group-hover:text-cyan/10"
            >
              {step}
            </span>
            <Icon className="h-6 w-6 text-cyan transition-transform duration-500 group-hover:-translate-y-1" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-semibold text-white">
              <span className="mr-2 font-mono text-[0.6rem] text-amber align-middle">{step}</span>
              {title}
            </h3>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-dim">{body}</p>
          </li>
        ))}
      </ol>

      {/* mapping table */}
      <div className="panel mt-6 overflow-hidden">
        <div className="border-b border-cyan/10 px-6 py-4">
          <h3 className="font-mono text-[0.65rem] tracking-[0.35em] text-cyan">THE TRANSLATION TABLE</h3>
          <p className="mt-1 text-sm text-ink-dim">Direct, deterministic mappings — no hand-tuned presets. Same frame in, same score out.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[0.8rem]">
            <thead>
              <tr className="border-b border-edge font-mono text-[0.55rem] uppercase tracking-[0.25em] text-ink-dim">
                <th scope="col" className="px-6 py-3">Visual signal</th>
                <th scope="col" className="px-6 py-3">What we measure</th>
                <th scope="col" className="px-6 py-3">Musical voice</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map(([a, b, c], i) => (
                <tr key={i} className={i % 2 ? "bg-white/[0.025]" : ""}>
                  <th scope="row" className="px-6 py-3 font-semibold text-ink align-top">{a}</th>
                  <td className="px-6 py-3 text-ink-dim align-top">{b}</td>
                  <td className="px-6 py-3 text-cyan/90 align-top">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* why + honesty */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          {
            icon: Ear,
            title: "Access is the point",
            body: "An estimated 2.2 billion people live with some form of vision impairment. When a climate anomaly is only ever rendered as a map, half the story reaches half the audience. A minor-third darkening as the beam crosses the Arctic cannot be misread by a blind listener — it simply is felt.",
          },
          {
            icon: Eye,
            title: "Ears hear what eyes miss",
            body: "The cochlea performs a Fourier transform in real time; audition is exquisite at detecting periodicities and slow drifts buried in noise. Sustained sonification can expose trends in a sea-ice or CO₂ sequence that flick past in the twelfth frame of an animation.",
          },
          {
            icon: HeartPulse,
            title: "Emotion is data transfer",
            body: "VIMH — the urgency, grief and awe of a changing planet — is information too. A bell that thins as the ice retreats does not editorialize; it contextualizes. Sonification turns a dataset into a relationship.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="panel p-6">
            <Icon className="h-6 w-6 text-amber" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-[0.83rem] leading-relaxed text-ink-dim">{body}</p>
          </div>
        ))}
      </div>

      {/* honest accordions */}
      <div className="mt-6 grid gap-3">
        {[
          {
            q: "Is this real science or just ambient music?",
            a: "Both, deliberately. The pitch material (tonic, scale, triads, register) is derived deterministically from the frame — change the pixels, change the notes. The timbre palette, groove and tempo curves are artistic rulesets layered on top, because a literal pixel=one-note dump is information-free noise. The art direction exists so the data survives the journey to your ear.",
          },
          {
            q: "Why pentatonic scales?",
            a: "A 12-note chromatic quantization of noisy chroma energy produces tritones and minor-seconds at random. Pentatonic fields (minor for dark frames, major for bright ones) guarantee consonance between any two columns, so the brain can attend to contour — the actual data — instead of wincing at intervals.",
          },
          {
            q: "Can I verify or reproduce this?",
            a: "Yes. The analysis lives in src/audio/analysis.ts (RGB→HSL, circular hue histogram, column statistics) and the synthesis in src/audio/engine.ts (Web Audio graph, 16th-note scheduler). No external services, no ML black box — every mapping in the table above is ~30 lines of auditable TypeScript.",
          },
        ].map(({ q, a }) => (
          <details key={q} className="rounded-xl border border-edge bg-panel/60 open:border-cyan/25">
            <summary className="cursor-pointer list-none px-6 py-4 font-display text-[0.95rem] font-semibold text-ink transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
              {q}
            </summary>
            <p className="border-t border-edge px-6 py-4 text-[0.86rem] leading-relaxed text-ink-dim">{a}</p>
          </details>
        ))}
      </div>

      {/* credits */}
      <p className="mt-6 px-1 text-center font-mono text-[0.55rem] uppercase leading-relaxed tracking-[0.2em] text-ink-dim">
        Visual frames rendered in the style of NASA's Earth Information Center · Data context: NASA GISS GISTEMP ·
        Suomi NPP VIIRS Black Marble · MODIS Ocean Color · NSIDC Sea Ice Index · NASA FIRMS · GEOS-FP Nature Run
      </p>
    </section>
  );
}
