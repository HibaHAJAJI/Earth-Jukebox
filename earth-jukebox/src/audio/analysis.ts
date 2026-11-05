/* ------------------------------------------------------------------ */
/*  Earth Jukebox — image sonification analysis                        */
/*  Reads a visual frame into a low-res luminance/chroma grid and      */
/*  derives musical structure: scale, root, rhythm density, per-column */
/*  note maps and regional chord roots.                                */
/* ------------------------------------------------------------------ */

export interface ColumnFeat {
  /** mean hue 0–360 */
  h: number;
  /** mean saturation 0–1 */
  s: number;
  /** mean lightness 0–1 */
  l: number;
  /** perceptual energy: lightness weighted by chroma 0–1 */
  energy: number;
  r: number;
  g: number;
  b: number;
}

export interface Features {
  columns: ColumnFeat[];
  /** 12 hue-bin energy histogram, normalized 0–1, bin i ≈ hue 30i° */
  hist: number[];
  avgHue: number;
  avgSat: number;
  avgLight: number;
  /** -1 (deep blue, cold) .. +1 (deep red, hot) */
  warmth: number;
  /** stddev of column lightness — visual contrast → rhythm density */
  contrast: number;
  /** pitch class 0–11 of the dominant spectral band */
  rootPc: number;
  mode: "minor" | "major";
  /** pitch-class roots for 4 horizontal regions (harmony travels with the beam) */
  regionRoots: number[];
  brightness: number;
  saturation: number;
}

export const NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
export const noteName = (midi: number) =>
  `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
export const pcName = (pc: number) => NOTE_NAMES[((pc % 12) + 12) % 12];
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export const MINOR_PENT_EXT = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
export const MAJOR_PENT_EXT = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

const COLS = 160;
const ROWS = 90;

/** Wrap-around smoothing so the hue wheel stays circular. */
function smoothHist(h: number[]): number[] {
  const out = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    out[i] = h[(i + 11) % 12] * 0.25 + h[i] * 0.5 + h[(i + 1) % 12] * 0.25;
  }
  return out;
}

function weightedRootPc(hist: number[]): number {
  let best = 0, bestV = -1;
  for (let i = 0; i < 12; i++) if (hist[i] > bestV) { bestV = hist[i]; best = i; }
  return best;
}

export function analyzeImage(img: HTMLImageElement): Features {
  const canvas = document.createElement("canvas");
  canvas.width = COLS;
  canvas.height = ROWS;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, COLS, ROWS);
  const data = ctx.getImageData(0, 0, COLS, ROWS).data;

  const histRaw = new Array(12).fill(0);
  let sumL = 0, sumS = 0, sumWarm = 0;

  // per-column accumulators
  const colR = new Float64Array(COLS);
  const colG = new Float64Array(COLS);
  const colB = new Float64Array(COLS);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = (y * COLS + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      colR[x] += r; colG[x] += g; colB[x] += b;
      const [h, s, l] = rgbToHsl(r, g, b);
      sumL += l; sumS += s; sumWarm += (r - b) / 255;
      if (l > 0.055) {
        const w = l * (0.3 + 0.7 * s);
        histRaw[Math.min(11, Math.floor(h / 30))] += w;
      }
    }
  }

  const n = COLS * ROWS;
  const brightness = sumL / n;
  const saturation = sumS / n;
  const warmth = sumWarm / n; // -1..1

  const histMax = Math.max(...histRaw, 1e-6);
  const hist = smoothHist(histRaw.map((v) => v / histMax));

  // per-column features (averaged hue via vector sum for circular correctness)
  const columns: ColumnFeat[] = [];
  let sumContrast = 0;
  let meanColL = 0;
  for (let x = 0; x < COLS; x++) {
    const r = colR[x] / ROWS, g = colG[x] / ROWS, b = colB[x] / ROWS;
    const [h, s, l] = rgbToHsl(r, g, b);
    columns.push({ h, s, l, energy: l * (0.35 + 0.65 * s), r, g, b });
    meanColL += l;
  }
  meanColL /= COLS;
  for (const c of columns) sumContrast += (c.l - meanColL) * (c.l - meanColL);
  const contrast = Math.sqrt(sumContrast / COLS);

  // regional harmony: split the frame into 4 horizontal regions
  const regionRoots: number[] = [];
  for (let region = 0; region < 4; region++) {
    const rh = new Array(12).fill(0);
    const from = Math.floor((region * COLS) / 4);
    const to = Math.floor(((region + 1) * COLS) / 4);
    for (let x = from; x < to; x++) {
      const c = columns[x];
      if (c.l > 0.055) {
        const w = c.energy + 0.12;
        rh[Math.min(11, Math.floor(c.h / 30))] += w;
      }
    }
    const smoothed = smoothHist(rh.map((v) => v));
    regionRoots.push(weightedRootPc(smoothed));
  }

  const rootPc = weightedRootPc(hist);
  const mode: Features["mode"] = brightness > 0.4 ? "major" : "minor";

  return {
    columns,
    hist,
    avgHue: circularMeanHue(columns),
    avgSat: saturation,
    avgLight: brightness,
    warmth,
    contrast,
    rootPc,
    mode,
    regionRoots,
    brightness,
    saturation,
  };
}

function circularMeanHue(cols: ColumnFeat[]): number {
  let sx = 0, sy = 0;
  for (const c of cols) {
    sx += Math.cos((c.h * Math.PI) / 180) * c.energy;
    sy += Math.sin((c.h * Math.PI) / 180) * c.energy;
  }
  let deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/** Load an image element for a track (cached pipeline entry point). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
