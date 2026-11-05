/* ------------------------------------------------------------------ */
/*  Earth Jukebox — track catalog                                      */
/*  Each "track" is a NASA Earth Information Center–style visual frame */
/*  paired with a live sonification ruleset derived from the pixels.   */
/* ------------------------------------------------------------------ */

export type HatDensity = "off" | "sparse" | "eighths" | "sixteenths";
export type EnergyClass = "ambient" | "pulse" | "driving";

export interface Groove {
  /** 16th-note steps that carry a kick drum */
  kick: number[];
  /** 16th-note steps that carry a snare / clap */
  snare: number[];
  /** hi-hat density */
  hat: HatDensity;
  /** 16th-note steps that carry the sub-bass */
  bass: number[];
  /** seconds for one full left→right beam sweep of the image */
  sweepSec: number;
  /** composed tempo (contrast-derived, artist-tuned) */
  bpm: number;
  /** subjective energy class, shown in the UI */
  energy: EnergyClass;
}

export interface Track {
  id: string;
  /** musical title */
  title: string;
  /** NASA dataset this frame illustrates */
  dataset: string;
  /** period covered by the data */
  era: string;
  /** credit line */
  credit: string;
  /** image path (generated in EIC visual style) */
  img: string;
  /** alt text — describes the frame for screen readers */
  alt: string;
  /** 3–4 sentence plain-language science explainer */
  science: string;
  /** "what to listen for" — guideposts for the ear */
  listening: string[];
  /** one-line spoken narration for the audio storyteller */
  narration: string;
  /** per-track accent hex used for chips / glows */
  accent: string;
  groove: Groove;
}

export const TRACKS: Track[] = [
  {
    id: "warming-world",
    title: "The Slow Fever",
    dataset: "Global Surface Temperature Anomaly",
    era: "1880 → 2024 · GISTEMP",
    credit: "NASA Goddard Institute for Space Studies · Earth Information Center",
    img: "/images/tracks/warming-world.jpg",
    alt: "False-color world map of global temperature anomalies, diverging blue to red. Deep red pools over the Arctic and continental interiors; oceans glow in pale rose; only isolated pockets remain blue against a dark indigo graticule.",
    science:
      "NASA's GISTEMP record blends millions of surface measurements from meteorological stations and ship tracks into a single anomaly map: the difference between today's temperature and the 1951–1980 baseline. The latest frames show a planet that has crossed 1.4 °C of warming, with the Arctic heating nearly four times faster than the global average — the reddest pixels on the map are also the fastest-changing places on Earth.",
    listening: [
      "The low drone is the pre-industrial baseline — steady, unresolved, always underneath.",
      "Red columns bloom into bright, dense bell clusters; blue columns fall back into near-silence.",
      "The pad chord darkens to a minor third each time the beam crosses the Arctic — the fever spikes there.",
    ],
    narration:
      "The Slow Fever. A century and a half of planetary temperature, read left to right. Every red column you would see becomes a brighter, higher cluster of notes; the Arctic, the reddest region, darkens the harmony into a minor chord. The pulse never resolves — because the data, so far, doesn't either.",
    accent: "#ff7a4d",
    groove: { kick: [0, 4, 8, 12], snare: [], hat: "eighths", bass: [0, 8, 14], sweepSec: 58, bpm: 96, energy: "pulse" },
  },
  {
    id: "black-marble",
    title: "Black Marble: The Pulse of Night",
    dataset: "VIIRS Nighttime Lights of the World",
    era: "Composite · Suomi NPP VIIRS DNB",
    credit: "NASA Earth Observatory · NOAA/NASA Suomi NPP · Earth Information Center",
    img: "/images/tracks/black-marble.jpg",
    alt: "Earth at night from deep space. A near-black planet webbed with amber-gold city lights; the densest constellations trace the Eastern United States, Europe, India and Japan. A soft aurora glows at the poles.",
    science:
      "Built from the Suomi NPP satellite's day-night band, Black Marble composites nine months of cloud-free night passes into one portrait of humanity. Light is a proxy for electrification, industry and economic output — and for inequality. Bright urban cores burn steadily while whole regions of sub-Saharan Africa and the Amazon remain nearly dark, a map of development written in photons.",
    listening: [
      "Darkness is true silence — most of the frame rests, letting each city flare like a plucked string.",
      "The kick drum fires in a double-thump — lub-dub — the heartbeat rhythm of a living grid.",
      "Bright megalopolises read as rolled, ringing harmonics high above the sub-bass.",
    ],
    narration:
      "Black Marble. Humanity seen only by the light it cannot help but emit. Long silences punctuated by golden cities — watch the beam cross the Eastern Seaboard or the Ganges plain and the score suddenly blooms. This is a map of eight billion decisions, humming at fifty hertz.",
    accent: "#ffc66e",
    groove: { kick: [0, 3, 8, 11], snare: [], hat: "sparse", bass: [0], sweepSec: 62, bpm: 72, energy: "pulse" },
  },
  {
    id: "breathing-ocean",
    title: "The Breathing Ocean",
    dataset: "Ocean Surface Currents & Chlorophyll",
    era: "Composite · MODIS / Ocean Color",
    credit: "NASA Earth Observatory · MODIS Aqua · Earth Information Center",
    img: "/images/tracks/breathing-ocean.jpg",
    alt: "False-color ocean surface from orbit: teal and jade filaments spiral into vast eddies across deep indigo water, tracing currents, upwelling and plankton blooms in luminous swirls.",
    science:
      "The ocean breathes. Currents coil into mesoscale eddies a hundred kilometers across, lifting nutrients into sunlight; phytoplankton answer with blooms so large they redraw the map of the sea. NASA's ocean-color record tracks chlorophyll as a proxy for the invisible machinery of the carbon cycle — the drifting, photosynthesizing engine that produces half of Earth's oxygen.",
    listening: [
      "Listen for the long swelling pads — eddies exhaling over slow four-bar arcs.",
      "Green-jade columns (plankton density) ring pentatonic bells over the low tide drone.",
      "The tempo never hurries: this track moves at the speed of currents, roughly a kilometer an hour.",
    ],
    narration:
      "The Breathing Ocean. Every swirl in the image is a hundred-kilometer eddy, and every eddy is a slow orchestral breath. Teal and jade tones ring like struck glass above a bass drone — this is the carbon engine that exhales half the oxygen you are breathing right now.",
    accent: "#2ee6c0",
    groove: { kick: [0, 10], snare: [], hat: "off", bass: [0, 8], sweepSec: 68, bpm: 84, energy: "ambient" },
  },
  {
    id: "vanishing-ice",
    title: "The Vanishing Ice",
    dataset: "Arctic Sea Ice Minimum Extent",
    era: "September minimum · NSIDC / EIC",
    credit: "NASA Goddard · NSIDC sea ice index · Earth Information Center",
    img: "/images/tracks/vanishing-ice.jpg",
    alt: "Polar view of Arctic sea ice: fractured white and cyan floes huddle near the pole against a vast expanse of dark open indigo water, the glowing ice edge frayed like a retreating shoreline.",
    science:
      "Each September the Arctic sea ice reaches its minimum. Since satellite records began in 1979, that minimum has shrunk by roughly 13 percent per decade — an area larger than Montana every ten years. First-year ice is thinner and saltier and shatters sooner; the white fraction of this frame is not a stable feature of the planet, but a retreating one.",
    listening: [
      "High, crystalline pings = fractured multi-year ice; long silences = open water.",
      "The piece is built almost entirely without drums — only a sub-bass moan, like pressure in a glacier.",
      "Hear the gap after the forty-second mark: that emptiness is 2020 and 2023, the emptiest Septembers on record.",
    ],
    narration:
      "The Vanishing Ice. Almost nothing plays — and that is the data. Bright crystalline pings are the last floes of multi-year ice; the silence between them is open ocean that did not exist a generation ago. If the rest of the catalog is a pulse, this is a held breath.",
    accent: "#8ee3ff",
    groove: { kick: [0], snare: [], hat: "off", bass: [0], sweepSec: 72, bpm: 60, energy: "ambient" },
  },
  {
    id: "fire-season",
    title: "Fire Season",
    dataset: "Global Wildfires & Smoke Aerosols",
    era: "365 days · NASA FIRMS VIIRS/MODIS",
    credit: "NASA EOSDIS FIRMS · Earth Information Center",
    img: "/images/tracks/fire-season.jpg",
    alt: "False-color aerosol visualization: rivers of orange smoke curl off glowing yellow-white fire hotspots across dark continents, embers densest along savanna belts and boreal forests.",
    science:
      "NASA's FIRMS system detects active fires within three hours, from orbit, every day of the year. The 2024 season burned an estimated area larger than Germany, and smoke aerosols — carbon monoxide, black carbon, fine particulate — circumnavigated the hemisphere in under two weeks. Fire season is no longer a season; satellites now detect significant fires in every month of the calendar.",
    listening: [
      "A driving four-on-the-floor kick — the rhythm of a landscape that does not get to rest.",
      "Ember columns (the brightest) drive 16th-note hat runs and syncopated snare cracks.",
      "The minor-key riff never resolves; the smoke, suspended in the stratosphere, doesn't either.",
    ],
    narration:
      "Fire Season. Every hotspot the satellites caught this year, struck like a match. This is the only track in the jukebox with a full backbeat — because fire does not wait for a resting point. When the hat rolls run, that's a pyrocumulonimbus punching into the stratosphere.",
    accent: "#ff9d3d",
    groove: { kick: [0, 4, 8, 12, 14], snare: [4, 12], hat: "sixteenths", bass: [0, 8, 10], sweepSec: 46, bpm: 104, energy: "driving" },
  },
  {
    id: "carbon-sky",
    title: "The Carbon Sky",
    dataset: "Atmospheric CO₂ Concentration, GEOS-FP",
    era: "Cycle · NASA GEOS-FP Nature Run",
    credit: "NASA Global Modeling & Assimilation Office · Earth Information Center",
    img: "/images/tracks/carbon-sky.jpg",
    alt: "Three-dimensional globe wrapped in translucent golden-green CO2 tracer plumes billowing from northern industrial belts, swirling eastward with the mid-latitude winds.",
    science:
      "Carbon dioxide is invisible, and this model makes it visible. NASA's GEOS-FP nature run injects every power plant and tailpipe on Earth into a global transport model and lets the winds carry it. The result: a permanent golden tide pooling over the industrial north, venting to the Arctic, and mixing slowly, relentlessly, into every hemisphere — over 420 parts per million and rising every year.",
    listening: [
      "The half-time snare drag feels like a slow, inevitable swell — an accumulating tide, not a storm.",
      "Dense golden columns fold into minor-second clusters — tension that leans but never resolves.",
      "Notice the shimmer pad never breathes in: the concentration only moves one direction.",
    ],
    narration:
      "The Carbon Sky. Four hundred and twenty parts per million, made audible as a slow half-time drag. The plumes never thin, never scatter, never leave — the harmony follows, leaning on minor seconds that refuse to resolve. This is what invisible looks like, and sounds like.",
    accent: "#d9c25a",
    groove: { kick: [0, 10], snare: [8], hat: "eighths", bass: [0, 8], sweepSec: 60, bpm: 76, energy: "pulse" },
  },
];
