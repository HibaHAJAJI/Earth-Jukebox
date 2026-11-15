import { identifyPlaceAt } from '../engine/worldGeography';

export type ClimateLayerId =
  | 'temperature'
  | 'seaIce'
  | 'oceanCurrents'
  | 'wildfiresCarbon';

export type AudioMode = 'ambient' | 'pixelScan';

export interface ClimateLayerSpec {
  id: ClimateLayerId;
  shortLabel: string;
  title: string;
  datasetSource: string;
  unit: string;
  baselineLabel: string;
  description: string;
  audioMappingNote: string;
  accentHex: string;
  legend: {
    minLabel: string;
    midLabel: string;
    maxLabel: string;
    gradientCss: string;
  };
  globalMetricAtYear: (year: number) => {
    formatted: string;
    numeric: number;
    deltaLabel: string;
  };
}

export interface ProbedLocation {
  lat: number;
  lon: number;
  regionName: string;
  normalizedValue: number;
  formattedValue: string;
  narrative: string;
}

export const MIN_YEAR = 1980;
export const MAX_YEAR = 2026;

export const CLIMATE_LAYERS: Record<ClimateLayerId, ClimateLayerSpec> = {
  temperature: {
    id: 'temperature',
    shortLabel: 'Temperature',
    title: 'Global Temperature Anomaly',
    datasetSource: 'NASA GISTEMP Surface Temperature',
    unit: '°C',
    baselineLabel: 'vs. 1951–1980 baseline',
    description:
      'Tracks planetary surface warming with pronounced Arctic amplification and continental heatwaves.',
    audioMappingNote:
      'Cooler baseline regions sustain calm open fifths; warming amber zones shift chord brightness and lift melodic harmonic pitch.',
    accentHex: '#F59E0B',
    legend: {
      minLabel: '-1.0°C',
      midLabel: '0.0°C',
      maxLabel: '+3.0°C',
      gradientCss: 'linear-gradient(90deg, #1d4ed8 0%, #334155 32%, #f59e0b 68%, #dc2626 100%)',
    },
    globalMetricAtYear: (year: number) => {
      const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
      const ensoWave = Math.sin((year - 1982) * 1.45) * 0.08;
      const val = 0.24 + t * 1.24 + Math.pow(t, 2) * 0.12 + ensoWave;
      return {
        numeric: val,
        formatted: `${val >= 0 ? '+' : ''}${val.toFixed(2)} °C`,
        deltaLabel: val > 1.2 ? 'Elevated warming' : val > 0.6 ? 'Moderate warming' : 'Near baseline',
      };
    },
  },
  seaIce: {
    id: 'seaIce',
    shortLabel: 'Sea Ice',
    title: 'Polar Sea-Ice Extent',
    datasetSource: 'NASA Cryosphere & NSIDC Record',
    unit: 'M km²',
    baselineLabel: 'September Arctic minimum',
    description:
      'Visualizes multi-decade retreat of seasonal Arctic and Antarctic sea ice cover.',
    audioMappingNote:
      'Dense ice sheets generate crystalline high-register chimes; retreating open polar water deepens sub-bass resonance.',
    accentHex: '#38BDF8',
    legend: {
      minLabel: 'Open Sea',
      midLabel: 'Thin Drift',
      maxLabel: 'Dense Ice',
      gradientCss: 'linear-gradient(90deg, #0f172a 0%, #0284c7 45%, #7dd3fc 75%, #f8fafc 100%)',
    },
    globalMetricAtYear: (year: number) => {
      const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
      const cycle = Math.cos((year - 1980) * 1.2) * 0.22;
      const val = Math.max(3.6, 7.85 - t * 3.65 + cycle);
      return {
        numeric: val,
        formatted: `${val.toFixed(2)} M km²`,
        deltaLabel: `${((val - 7.85) / 7.85 * 100).toFixed(0)}% vs. 1980`,
      };
    },
  },
  oceanCurrents: {
    id: 'oceanCurrents',
    shortLabel: 'Oceans',
    title: 'Ocean Heat & Currents',
    datasetSource: 'NASA ECCO2 Ocean Circulation',
    unit: 'W/m²',
    baselineLabel: 'Upper-ocean thermal flux',
    description:
      'Highlights marine heat transport along the Gulf Stream, Kuroshio, and Equatorial Pacific.',
    audioMappingNote:
      'Flowing thermal gradients modulate stereo oceanic sweeps and slow low-pass filter swells.',
    accentHex: '#06B6D4',
    legend: {
      minLabel: '-15 W/m²',
      midLabel: '0 W/m²',
      maxLabel: '+35 W/m²',
      gradientCss: 'linear-gradient(90deg, #1e1b4b 0%, #0e7490 42%, #22d3ee 72%, #fb923c 100%)',
    },
    globalMetricAtYear: (year: number) => {
      const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
      const val = 0.42 + t * 0.88 + Math.sin(year * 0.9) * 0.06;
      return {
        numeric: val,
        formatted: `+${val.toFixed(2)} W/m²`,
        deltaLabel: val > 1.0 ? 'High ocean heat uptake' : 'Steady circulation',
      };
    },
  },
  wildfiresCarbon: {
    id: 'wildfiresCarbon',
    shortLabel: 'Fires & CO₂',
    title: 'Wildfires & Carbon Plumes',
    datasetSource: 'NASA OCO-2 & FIRMS Fire Activity',
    unit: 'ppm',
    baselineLabel: 'Atmospheric CO₂ concentration',
    description:
      'Maps major seasonal biomass burning corridors alongside rising global carbon concentrations.',
    audioMappingNote:
      'Clustered fire density triggers subtle rhythmic ember pulses over a rising harmonic carbon bed.',
    accentHex: '#FB7185',
    legend: {
      minLabel: '340 ppm',
      midLabel: '385 ppm',
      maxLabel: '430+ ppm',
      gradientCss: 'linear-gradient(90deg, #1e293b 0%, #7c2d12 45%, #f59e0b 75%, #f43f5e 100%)',
    },
    globalMetricAtYear: (year: number) => {
      const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
      const val = 338.7 + t * 76.0 + Math.pow(t, 1.8) * 14.5;
      return {
        numeric: val,
        formatted: `${val.toFixed(1)} ppm`,
        deltaLabel: `+${(val - 338.7).toFixed(1)} ppm since 1980`,
      };
    },
  },
};

export const CLIMATE_LAYER_ORDER: ClimateLayerId[] = [
  'temperature',
  'seaIce',
  'oceanCurrents',
  'wildfiresCarbon',
];

// Deterministic hash-based 2D value noise for geography & climate textures
export function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function valueNoise2D(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);

  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2D(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return sum;
}

function gaussian2D(
  lat: number,
  lon: number,
  cLat: number,
  cLon: number,
  rLat: number,
  rLon: number,
  rotRad = 0
): number {
  let dLon = lon - cLon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const maxR = Math.max(rLat, rLon) * 3.2;
  if (Math.abs(lat - cLat) > maxR || Math.abs(dLon) > maxR) return 0;

  const dLat = lat - cLat;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const rx = (dLon * cosR - dLat * sinR) / rLon;
  const ry = (dLon * sinR + dLat * cosR) / rLat;
  const d2 = rx * rx + ry * ry;
  return d2 > 9.0 ? 0 : Math.exp(-d2);
}

// High-detail procedural Earth topography (continents, inland seas, islands, mountain spines)
export function getLandElevation(lat: number, lon: number): number {
  // Antarctica with Ross Sea & Weddell Sea indentations and Antarctic Peninsula
  if (lat < -61) {
    const antNoise = fbm2D((lon + 180) * 0.05, (lat + 90) * 0.09, 3);
    const peninsula = gaussian2D(lat, lon, -67, -63, 5, 3, 0.3) * 0.7;
    const rossCut = gaussian2D(lat, lon, -77, 175, 6, 16) * 0.75;
    const weddellCut = gaussian2D(lat, lon, -75, -45, 6, 15) * 0.72;
    const antMass =
      (lat < -71 + (antNoise - 0.5) * 8 ? 0.65 : 0) +
      peninsula -
      rossCut -
      weddellCut;
    if (antMass > 0.25) {
      return 0.35 + antMass * 0.45 + antNoise * 0.2;
    }
  }

  let field = 0;

  // North America + Alaska + Mexico + Hudson Bay & Gulf of Mexico cutouts
  field += gaussian2D(lat, lon, 49, -104, 13, 22, -0.22) * 1.08;
  field += gaussian2D(lat, lon, 63, -148, 5, 13, 0.08) * 0.88; // Alaska
  field += gaussian2D(lat, lon, 54, -70, 7, 10, 0.2) * 0.78; // Quebec/Labrador
  field += gaussian2D(lat, lon, 37, -88, 9, 13, 0.1) * 0.84; // Eastern US
  field += gaussian2D(lat, lon, 28, -81.5, 4.5, 2.2, -0.2) * 0.55; // Florida
  field += gaussian2D(lat, lon, 23, -102, 7, 5, -0.45) * 0.82; // Mexico
  field += gaussian2D(lat, lon, 14, -87, 3.5, 5.5, -0.5) * 0.58; // Central America
  field += gaussian2D(lat, lon, 21.5, -78, 1.5, 4.5, -0.15) * 0.45; // Cuba / Caribbean
  field -= gaussian2D(lat, lon, 59, -85, 5.5, 7.5) * 0.78; // Hudson Bay cutout
  field -= gaussian2D(lat, lon, 25, -90, 5.2, 7.2) * 0.92; // Gulf of Mexico cutout

  // Greenland & Iceland
  field += gaussian2D(lat, lon, 73, -42, 8.5, 11, 0.2) * 1.12;
  field += gaussian2D(lat, lon, 65, -18, 2.2, 3.8) * 0.56;

  // South America (distinct bulge + tapered Patagonia)
  field += gaussian2D(lat, lon, -6, -61, 11, 13, -0.15) * 1.12;
  field += gaussian2D(lat, lon, -11, -43, 8, 8, 0.25) * 0.85; // Eastern Brazil
  field += gaussian2D(lat, lon, -27, -64, 12, 6.5, 0.18) * 0.92;
  field += gaussian2D(lat, lon, -45, -69, 9, 3.2, 0.1) * 0.74; // Patagonia

  // Europe + Scandinavia + UK + Iberia + Italy + Mediterranean Sea cutout
  field += gaussian2D(lat, lon, 49, 15, 7.5, 15, 0.1) * 0.94;
  field += gaussian2D(lat, lon, 40.5, -4, 3.8, 4.5) * 0.74; // Iberia
  field += gaussian2D(lat, lon, 42.5, 12.5, 4.2, 2.0, -0.45) * 0.65; // Italy
  field += gaussian2D(lat, lon, 54, -2.5, 3.5, 2.5) * 0.6; // Great Britain
  field += gaussian2D(lat, lon, 63, 16, 6.5, 6.5, 0.4) * 0.86; // Scandinavia
  field -= gaussian2D(lat, lon, 35.5, 17, 4.2, 16, -0.05) * 1.05; // Mediterranean Sea
  field -= gaussian2D(lat, lon, 43.5, 34, 2.6, 5.5) * 0.72; // Black Sea
  field -= gaussian2D(lat, lon, 58, 20, 4.5, 3.5, 0.3) * 0.55; // Baltic Sea

  // Africa (Maghreb, West Africa, Horn of Africa, Southern Africa, Madagascar, Red Sea)
  field += gaussian2D(lat, lon, 21, 9, 12, 18, 0.05) * 1.08;
  field += gaussian2D(lat, lon, 13, -10, 6.5, 8) * 0.82; // West Africa bulge
  field += gaussian2D(lat, lon, 7, 41, 6.5, 7.5, 0.3) * 0.76; // Horn of Africa
  field += gaussian2D(lat, lon, -12, 24, 15, 11, -0.08) * 1.06;
  field += gaussian2D(lat, lon, -19, 46.5, 5.5, 2.4, 0.25) * 0.72; // Madagascar
  field -= gaussian2D(lat, lon, 3, 2, 6, 8.5) * 0.85; // Gulf of Guinea cutout
  field -= gaussian2D(lat, lon, 21, 38.5, 7, 2.2, -0.45) * 0.85; // Red Sea rift

  // Middle East & Asia
  field += gaussian2D(lat, lon, 24, 45, 7.5, 8.5, -0.35) * 0.94; // Arabian Peninsula
  field -= gaussian2D(lat, lon, 26.5, 52, 2.2, 4.2, -0.4) * 0.72; // Persian Gulf
  field += gaussian2D(lat, lon, 56, 86, 13, 38, 0.05) * 1.14; // Siberia / Steppe
  field += gaussian2D(lat, lon, 62, 146, 6, 18, 0.15) * 0.82; // Russian Far East
  field += gaussian2D(lat, lon, 34, 104, 12, 20, -0.1) * 1.06; // East Asia / Tibet
  field += gaussian2D(lat, lon, 21, 78, 8.5, 6.5) * 0.92; // India
  field += gaussian2D(lat, lon, 15, 102, 7.5, 5.5, -0.2) * 0.76; // Indochina
  field += gaussian2D(lat, lon, 3.5, 102, 3.5, 2.0, -0.4) * 0.56; // Malay Peninsula
  field += gaussian2D(lat, lon, 37, 127.5, 2.8, 1.8) * 0.54; // Korea
  field += gaussian2D(lat, lon, 36.5, 138.5, 5.2, 2.5, 0.55) * 0.68; // Japan
  field += gaussian2D(lat, lon, 56, 160, 4.5, 2.2, 0.35) * 0.58; // Kamchatka
  field -= gaussian2D(lat, lon, 13, 88, 6.5, 5.5) * 0.75; // Bay of Bengal
  field -= gaussian2D(lat, lon, 13, 114, 7.5, 6.5) * 0.8; // South China Sea

  // Maritime Continent & Oceania
  field += gaussian2D(lat, lon, -1, 102, 2.8, 4.5, -0.55) * 0.58; // Sumatra
  field += gaussian2D(lat, lon, 0.5, 114, 3.2, 3.5) * 0.6; // Borneo
  field += gaussian2D(lat, lon, -7.2, 110, 1.4, 5.0) * 0.52; // Java
  field += gaussian2D(lat, lon, -5, 141, 3.5, 7.5, -0.25) * 0.62; // New Guinea
  field += gaussian2D(lat, lon, 13, 122, 4.0, 2.0) * 0.52; // Philippines
  field += gaussian2D(lat, lon, -25, 134, 9.5, 16, -0.1) * 1.08; // Australia
  field -= gaussian2D(lat, lon, -14, 139, 3.2, 3.5) * 0.58; // Gulf of Carpentaria
  field -= gaussian2D(lat, lon, -34, 131, 3.0, 5.5) * 0.55; // Great Australian Bight
  field += gaussian2D(lat, lon, -42, 172, 4.5, 2.2, 0.45) * 0.62; // New Zealand

  // Coastal fractal detail + tectonic mountain ridges (Himalayas, Andes, Rockies, Alps)
  const u = (lon + 180) * 0.065;
  const v = (lat + 90) * 0.065;
  const coastNoise = fbm2D(u, v, 4);
  const microRidge = fbm2D(u * 2.8 + 13.7, v * 2.8 + 7.1, 3);

  const himalayas = gaussian2D(lat, lon, 32, 86, 4.5, 13, -0.2) * 0.62;
  const andes = gaussian2D(lat, lon, -20, -69, 22, 2.6, 0.08) * 0.52;
  const rockies = gaussian2D(lat, lon, 46, -113, 14, 4.0, -0.28) * 0.42;
  const alps = gaussian2D(lat, lon, 46.5, 10, 2.2, 5.0, 0.15) * 0.35;

  const baseLand = field + (coastNoise - 0.48) * 0.46 + (microRidge - 0.5) * 0.16 - 0.5;
  if (baseLand <= 0) return baseLand;

  // Boost actual mountain elevation on land
  return baseLand + himalayas + andes + rockies + alps;
}

export function getRegionName(lat: number, lon: number): string {
  if (lat > 66) return 'Arctic Circle';
  if (lat < -62) return 'Antarctic Ice Sheet';
  if (lat >= 15 && lat <= 66 && lon >= -165 && lon <= -52) return 'North America';
  if (lat >= -56 && lat < 15 && lon >= -84 && lon <= -34) return 'South America & Amazon';
  if (lat >= 35 && lat <= 66 && lon > -15 && lon <= 40) return 'Europe & Mediterranean';
  if (lat >= -36 && lat < 35 && lon >= -20 && lon <= 52) return 'Africa & Sahara Belt';
  if (lat >= 8 && lat <= 66 && lon > 40 && lon <= 150) return 'Eurasia & Siberia';
  if (lat >= -46 && lat < -8 && lon >= 110 && lon <= 180) return 'Australia & Oceania';
  if (lat >= -15 && lat <= 15 && lon >= -170 && lon <= -85) return 'Equatorial Pacific (ENSO)';
  if (lat >= 20 && lat <= 55 && lon >= -75 && lon <= -15) return 'North Atlantic & Gulf Stream';
  if (lat < 0 && lon >= 40 && lon <= 110) return 'Indian Ocean';
  return lon >= -70 && lon <= 20 ? 'Atlantic Basin' : 'Pacific Basin';
}

export interface ClimateSample {
  normalized: number; // 0..1
  formattedValue: string;
  regionName: string;
  narrative: string;
}

export function sampleClimatePoint(
  layerId: ClimateLayerId,
  lat: number,
  lon: number,
  year: number,
  isLandOverride?: boolean
): ClimateSample {
  const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
  let isLand: boolean;
  let regionName: string;

  if (isLandOverride !== undefined) {
    isLand = isLandOverride;
    regionName = '';
  } else {
    const place = identifyPlaceAt(lat, lon);
    isLand = place.isLand;
    regionName = place.placeName;
  }

  const spatialVar = fbm2D((lon + 180) * 0.05 + t * 0.3, (lat + 90) * 0.05, 3);

  if (layerId === 'temperature') {
    const arcticAmp = Math.max(0, (lat - 52) / 38) * 1.45;
    const landBoost = isLand ? 0.32 : 0.0;
    const enso =
      Math.sin((year - 1982) * 1.45) *
      gaussian2D(lat, lon, 0, -125, 11, 40) *
      0.55;
    const anomalyC =
      -0.25 +
      t * (1.25 + arcticAmp + landBoost) +
      (spatialVar - 0.45) * 0.9 +
      enso;
    const clamped = Math.max(-1.0, Math.min(3.4, anomalyC));
    const normalized = Math.max(0, Math.min(1, (clamped + 1.0) / 4.2));
    return {
      normalized,
      formattedValue: `${clamped >= 0 ? '+' : ''}${clamped.toFixed(2)} °C`,
      regionName,
      narrative: `${regionName} (${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(0)}°${lon >= 0 ? 'E' : 'W'}) shows a ${clamped >= 0 ? '+' : ''}${clamped.toFixed(1)}°C temperature anomaly in ${year}.`,
    };
  }

  if (layerId === 'seaIce') {
    const absLat = Math.abs(lat);
    const iceEdge = 71 + t * 9.5 + (spatialVar - 0.5) * 7.5;
    let iceCover = 0;
    if (!isLand && absLat > iceEdge - 6) {
      iceCover = Math.max(0, Math.min(1, (absLat - (iceEdge - 6)) / 10));
    }
    if (lat < -68 && isLand) iceCover = 0.92;
    const concentrationPct = Math.round(iceCover * 100);
    return {
      normalized: iceCover,
      formattedValue: `${concentrationPct}% ice cover`,
      regionName,
      narrative: `${regionName} in ${year}: approximately ${concentrationPct}% ice concentration.`,
    };
  }

  if (layerId === 'oceanCurrents') {
    if (isLand) {
      return {
        normalized: 0.08,
        formattedValue: 'Landmass',
        regionName,
        narrative: `${regionName}; coastal oceans nearby carry thermal current energy.`,
      };
    }
    const gulfStream = gaussian2D(lat, lon, 37, -56, 8, 22, 0.35);
    const kuroshio = gaussian2D(lat, lon, 34, 148, 8, 24, 0.25);
    const equatorial = gaussian2D(lat, lon, 0, -130, 9, 45);
    const southern = gaussian2D(lat, lon, -48, lon, 10, 180) * 0.35;
    const flux =
      -6 +
      t * 14 +
      (gulfStream + kuroshio + equatorial * (0.7 + 0.3 * Math.sin(year))) * 22 +
      southern * 12 +
      (spatialVar - 0.5) * 10;
    const normalized = Math.max(0, Math.min(1, (flux + 15) / 50));
    return {
      normalized,
      formattedValue: `${flux >= 0 ? '+' : ''}${flux.toFixed(1)} W/m²`,
      regionName,
      narrative: `${regionName} ocean heat flux is ${flux >= 0 ? '+' : ''}${flux.toFixed(1)} watts per square meter in ${year}.`,
    };
  }

  // wildfiresCarbon
  const amazon = gaussian2D(lat, lon, -8, -58, 9, 14);
  const centralAfrica = gaussian2D(lat, lon, -3, 22, 10, 14);
  const boreal =
    gaussian2D(lat, lon, 58, -108, 7, 22) +
    gaussian2D(lat, lon, 60, 102, 8, 32);
  const mediterranean = gaussian2D(lat, lon, 39, 16, 6, 16);
  const australia = gaussian2D(lat, lon, -24, 134, 8, 14);

  const fireHotspots = isLand
    ? Math.min(1, (amazon + centralAfrica + boreal + mediterranean + australia) * (0.55 + t * 0.65) * (0.55 + spatialVar))
    : 0;
  const co2Base = 339 + t * 88 + fireHotspots * 18 + (spatialVar - 0.4) * 6;
  const normalized = Math.max(0, Math.min(1, 0.12 + t * 0.35 + fireHotspots * 0.62));
  return {
    normalized,
    formattedValue: `${co2Base.toFixed(0)} ppm`,
    regionName,
    narrative: `${regionName} in ${year}: atmospheric CO₂ near ${co2Base.toFixed(0)} ppm${fireHotspots > 0.35 ? ' with elevated wildfire plume activity' : ''}.`,
  };
}
