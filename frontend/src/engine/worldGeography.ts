import * as THREE from 'three';
import { feature, merge, mesh } from 'topojson-client';
import type { Topology, GeometryCollection, Polygon, MultiPolygon } from 'topojson-specification';
import countriesAtlasRaw from 'world-atlas/countries-50m.json';

export interface CountryFeatureRecord {
  id: string;
  name: string;
  rings: number[][][]; // array of polygon outer/inner rings: [lon, lat][]
  bbox: [number, number, number, number]; // [minLon, maxLon, minLat, maxLat]
  centroid: [number, number]; // [lon, lat]
  areaApprox: number;
}

export interface WorldLabelPoint {
  name: string;
  lat: number;
  lon: number;
  tier: 'continent' | 'ocean' | 'majorCountry' | 'country' | 'city';
}

interface CountryProps {
  name?: string;
}

const topology = countriesAtlasRaw as unknown as Topology<{
  countries: GeometryCollection<CountryProps>;
  land: GeometryCollection;
}>;

const isMoroccoOrSahara = (obj?: { id?: string | number; properties?: CountryProps }) =>
  Boolean(
    obj &&
      (String(obj.id) === '504' ||
        String(obj.id) === '732' ||
        obj.properties?.name === 'Morocco' ||
        obj.properties?.name === 'W. Sahara')
  );

// Merge Morocco (504) and Western Sahara (732) into one undivided sovereign polygon
const moroccoParts = topology.objects.countries.geometries.filter(
  (g): g is Polygon<CountryProps> | MultiPolygon<CountryProps> =>
    isMoroccoOrSahara(g) && (g.type === 'Polygon' || g.type === 'MultiPolygon')
);
const unifiedMoroccoGeom = moroccoParts.length > 0 ? merge(topology, moroccoParts) : null;

const rawCountriesGeo = feature(topology, topology.objects.countries);
const countriesFeatures = rawCountriesGeo.features.filter((f) => !isMoroccoOrSahara(f));
if (unifiedMoroccoGeom) {
  countriesFeatures.push({
    type: 'Feature',
    id: '504',
    properties: { name: 'Morocco' },
    geometry: unifiedMoroccoGeom,
  });
}

const landGeo = feature(topology, topology.objects.land);
const bordersMultiLine = mesh(
  topology,
  topology.objects.countries,
  (a, b) => a !== b && !(isMoroccoOrSahara(a) && isMoroccoOrSahara(b))
);
const coastMultiLine = mesh(topology, topology.objects.land);

function computeRingAreaAndCentroid(ring: number[][]): {
  area: number;
  lon: number;
  lat: number;
} {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < ring.length; i++) {
      sx += ring[i][0];
      sy += ring[i][1];
    }
    const len = Math.max(1, ring.length);
    return { area: 0.01, lon: sx / len, lat: sy / len };
  }
  return {
    area: Math.abs(area),
    lon: cx / (6 * area),
    lat: cy / (6 * area),
  };
}

// Parse all countries once into fast spatial lookup records
export const COUNTRY_RECORDS: CountryFeatureRecord[] = [];

for (const feat of countriesFeatures) {
  const geom = feat.geometry;
  if (!geom) continue;
  const name = feat.properties?.name || 'Territory';
  const id = String(feat.id ?? name);

  const polygonRings: number[][][] = [];
  if (geom.type === 'Polygon') {
    if (geom.coordinates[0]) polygonRings.push(geom.coordinates[0]);
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (poly[0]) polygonRings.push(poly[0]);
    }
  }
  if (polygonRings.length === 0) continue;

  // Use largest polygon ring for centroid & bounding box sanity
  let bestRing = polygonRings[0];
  let bestStats = computeRingAreaAndCentroid(bestRing);
  let totalArea = 0;

  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;

  for (const ring of polygonRings) {
    const st = computeRingAreaAndCentroid(ring);
    totalArea += st.area;
    if (st.area > bestStats.area) {
      bestStats = st;
      bestRing = ring;
    }
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  COUNTRY_RECORDS.push({
    id,
    name,
    rings: polygonRings,
    bbox: [minLon, maxLon, minLat, maxLat],
    centroid: [bestStats.lon, bestStats.lat],
    areaApprox: totalArea,
  });
}

// Sort smallest territories first so enclaves and island nations match before larger neighbors
COUNTRY_RECORDS.sort((a, b) => a.areaApprox - b.areaApprox);

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (Math.abs(xi - xj) > 180) continue; // skip antimeridian wrap edge
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findCountryAt(lat: number, lon: number): string | null {
  for (let i = 0; i < COUNTRY_RECORDS.length; i++) {
    const rec = COUNTRY_RECORDS[i];
    const [minLon, maxLon, minLat, maxLat] = rec.bbox;
    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) continue;
    for (let r = 0; r < rec.rings.length; r++) {
      if (pointInRing(lon, lat, rec.rings[r])) {
        return rec.name;
      }
    }
  }
  return null;
}

export function findOceanOrSeaAt(lat: number, lon: number): string {
  if (lat > 66.5) return 'Arctic Ocean';
  if (lat < -60) return 'Southern Ocean';
  if (lat >= 30 && lat <= 46 && lon >= -6 && lon <= 37) return 'Mediterranean Sea';
  if (lat >= 12 && lat <= 30 && lon >= 32 && lon <= 44) return 'Red Sea';
  if (lat >= 18 && lat <= 31 && lon >= -98 && lon <= -80) return 'Gulf of Mexico';
  if (lat >= 9 && lat <= 22 && lon >= -85 && lon <= -60) return 'Caribbean Sea';
  if (lat >= 51 && lat <= 64 && lon >= -95 && lon <= -76) return 'Hudson Bay';
  if (lat >= -60 && lat <= 30 && lon >= 20 && lon <= 120) return 'Indian Ocean';
  if (lon >= -75 && lon <= 20) {
    return lat >= 0 ? 'North Atlantic Ocean' : 'South Atlantic Ocean';
  }
  return lat >= 0 ? 'North Pacific Ocean' : 'South Pacific Ocean';
}

export function identifyPlaceAt(
  lat: number,
  lon: number
): { placeName: string; isLand: boolean } {
  const country = findCountryAt(lat, lon);
  if (country) {
    return { placeName: country, isLand: true };
  }
  return { placeName: findOceanOrSeaAt(lat, lon), isLand: false };
}

/**
 * Converts geographic (lat, lon) in degrees to Three.js SphereGeometry local coordinates
 * matching SphereGeometry UV mapping (u = (lon + 180)/360, v = (lat + 90)/180).
 */
export function latLonToSphereVec3(
  latDeg: number,
  lonDeg: number,
  radius: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const phi = (lonDeg + 180) * (Math.PI / 180);
  const theta = (90 - latDeg) * (Math.PI / 180);
  target.set(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return target;
}

/**
 * Creates crisp 3D vector LineSegments for real-world country borders and coastlines
 * so boundaries remain razor-sharp at any zoom distance.
 */
export function createVectorBordersGeometry(radius: number): {
  bordersGeo: THREE.BufferGeometry;
  coastsGeo: THREE.BufferGeometry;
} {
  const buildFromMultiLine = (lines: number[][][]): THREE.BufferGeometry => {
    const positions: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();

    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lon1, lat1] = line[i];
        const [lon2, lat2] = line[i + 1];
        if (Math.abs(lon1 - lon2) > 180) continue;
        latLonToSphereVec3(lat1, lon1, radius, a);
        latLonToSphereVec3(lat2, lon2, radius, b);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  };

  const bordersGeo = buildFromMultiLine(bordersMultiLine.coordinates);
  const coastsGeo = buildFromMultiLine(coastMultiLine.coordinates);
  return { bordersGeo, coastsGeo };
}

/**
 * Creates a subtle 30-degree scientific latitude/longitude graticule wireframe sphere.
 */
export function createGraticuleGeometry(radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();

  // Parallels every 30 degrees (60S, 30S, Equator, 30N, 60N)
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 4) {
      latLonToSphereVec3(lat, lon, radius, a);
      latLonToSphereVec3(lat, lon + 4, radius, b);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  // Meridians every 30 degrees
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -84; lat < 84; lat += 4) {
      latLonToSphereVec3(lat, lon, radius, a);
      latLonToSphereVec3(lat + 4, lon, radius, b);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

/**
 * Rasterizes the exact Natural Earth 1:50m land polygons onto an equirectangular canvas.
 */
export function rasterizeRealLandMask(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff';
  const drawRings = (rings: number[][][]) => {
    ctx.beginPath();
    for (const ring of rings) {
      if (ring.length < 3) continue;
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const x = ((lon + 180) / 360) * width;
        const y = ((90 - lat) / 180) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fill('evenodd');
  };

  for (const feat of landGeo.features) {
    const geom = feat.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      drawRings(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        drawRings(poly);
      }
    }
  }

  return canvas;
}

// Curated major countries + oceans + continents for clean, readable zoom-responsive globe labels
const CONTINENT_AND_OCEAN_LABELS: WorldLabelPoint[] = [
  { name: 'North America', lat: 46, lon: -102, tier: 'continent' },
  { name: 'South America', lat: -14, lon: -58, tier: 'continent' },
  { name: 'Africa', lat: 6, lon: 20, tier: 'continent' },
  { name: 'Europe', lat: 51, lon: 14, tier: 'continent' },
  { name: 'Asia', lat: 48, lon: 92, tier: 'continent' },
  { name: 'Australia', lat: -25, lon: 134, tier: 'continent' },
  { name: 'Antarctica', lat: -80, lon: 0, tier: 'continent' },
  { name: 'Atlantic Ocean', lat: 24, lon: -42, tier: 'ocean' },
  { name: 'Pacific Ocean', lat: 10, lon: -145, tier: 'ocean' },
  { name: 'Indian Ocean', lat: -20, lon: 78, tier: 'ocean' },
  { name: 'Mediterranean Sea', lat: 35.5, lon: 16, tier: 'ocean' },
];

// Curated country overrides for clean visual centroids (avoiding overseas territories skewing centroids)
const COUNTRY_CENTROID_OVERRIDES: Record<string, [number, number]> = {
  'United States of America': [39.5, -98.5],
  France: [46.6, 2.2],
  Norway: [64.5, 12.0],
  Russia: [61.5, 96.0],
  Canada: [58.0, -106.0],
  Denmark: [56.0, 10.0],
  Netherlands: [52.2, 5.3],
  Portugal: [39.6, -8.0],
  Spain: [40.2, -3.7],
  Morocco: [28.6, -9.8],
  Indonesia: [-2.2, 117.5],
  Malaysia: [4.2, 102.0],
  Japan: [36.2, 138.3],
  'United Kingdom': [54.2, -2.5],
  Chile: [-35.5, -71.5],
  'New Zealand': [-41.8, 172.5],
};

const MAJOR_COUNTRIES = new Set([
  'Morocco',
  'Algeria',
  'Egypt',
  'Nigeria',
  'South Africa',
  'Kenya',
  'Ethiopia',
  'Saudi Arabia',
  'France',
  'Spain',
  'Italy',
  'Germany',
  'United Kingdom',
  'Turkey',
  'Ukraine',
  'Poland',
  'Sweden',
  'Norway',
  'United States of America',
  'Canada',
  'Mexico',
  'Brazil',
  'Argentina',
  'Colombia',
  'Peru',
  'Chile',
  'Russia',
  'China',
  'India',
  'Japan',
  'South Korea',
  'Indonesia',
  'Australia',
  'Greenland',
  'Iran',
  'Pakistan',
  'Kazakhstan',
  'Mongolia',
  'Dem. Rep. Congo',
  'Sudan',
  'Libya',
  'Mauritania',
  'Mali',
  'Niger',
  'Chad',
  'Angola',
  'Tanzania',
  'Madagascar',
  'Thailand',
  'Vietnam',
  'Philippines',
  'New Zealand',
  'Portugal',
  'Greece',
  'Romania',
  'Finland',
  'Iceland',
  'Venezuela',
  'Bolivia',
  'Ecuador',
  'Cuba',
  'Iraq',
  'Yemen',
  'Oman',
  'Afghanistan',
  'Myanmar',
]);

const CITY_LANDMARKS: WorldLabelPoint[] = [
  { name: 'Rabat', lat: 34.02, lon: -6.84, tier: 'city' },
  { name: 'Casablanca', lat: 33.57, lon: -7.59, tier: 'city' },
  { name: 'Marrakech', lat: 31.63, lon: -7.98, tier: 'city' },
  { name: 'Tangier', lat: 35.76, lon: -5.83, tier: 'city' },
  { name: 'Dakhla', lat: 23.71, lon: -15.93, tier: 'city' },
  { name: 'Madrid', lat: 40.42, lon: -3.7, tier: 'city' },
  { name: 'Paris', lat: 48.86, lon: 2.35, tier: 'city' },
  { name: 'London', lat: 51.51, lon: -0.13, tier: 'city' },
  { name: 'Rome', lat: 41.9, lon: 12.5, tier: 'city' },
  { name: 'Cairo', lat: 30.04, lon: 31.24, tier: 'city' },
  { name: 'Istanbul', lat: 41.01, lon: 28.98, tier: 'city' },
  { name: 'Riyadh', lat: 24.71, lon: 46.68, tier: 'city' },
  { name: 'Nairobi', lat: -1.29, lon: 36.82, tier: 'city' },
  { name: 'Cape Town', lat: -33.92, lon: 18.42, tier: 'city' },
  { name: 'New York', lat: 40.71, lon: -74.01, tier: 'city' },
  { name: 'Mexico City', lat: 19.43, lon: -99.13, tier: 'city' },
  { name: 'Rio de Janeiro', lat: -22.91, lon: -43.17, tier: 'city' },
  { name: 'Buenos Aires', lat: -34.6, lon: -58.38, tier: 'city' },
  { name: 'New Delhi', lat: 28.61, lon: 77.21, tier: 'city' },
  { name: 'Beijing', lat: 39.9, lon: 116.4, tier: 'city' },
  { name: 'Tokyo', lat: 35.68, lon: 139.69, tier: 'city' },
  { name: 'Jakarta', lat: -6.21, lon: 106.85, tier: 'city' },
  { name: 'Sydney', lat: -33.87, lon: 151.21, tier: 'city' },
  { name: 'Reykjavik', lat: 64.15, lon: -21.94, tier: 'city' },
];

export const GLOBE_LABELS: WorldLabelPoint[] = (() => {
  const list: WorldLabelPoint[] = [...CONTINENT_AND_OCEAN_LABELS];
  const seen = new Set<string>();

  for (const rec of COUNTRY_RECORDS) {
    if (seen.has(rec.name)) continue;
    if (rec.areaApprox < 3.5 && !MAJOR_COUNTRIES.has(rec.name)) continue;
    seen.add(rec.name);

    const override = COUNTRY_CENTROID_OVERRIDES[rec.name];
    const lon = override ? override[1] : rec.centroid[0];
    const lat = override ? override[0] : rec.centroid[1];

    const displayName =
      rec.name === 'United States of America'
        ? 'United States'
        : rec.name === 'Dem. Rep. Congo'
        ? 'DR Congo'
        : rec.name;

    list.push({
      name: displayName,
      lat,
      lon,
      tier: MAJOR_COUNTRIES.has(rec.name) ? 'majorCountry' : 'country',
    });
  }

  list.push(...CITY_LANDMARKS);
  return list;
})();
