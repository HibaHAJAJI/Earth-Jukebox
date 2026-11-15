import * as THREE from 'three';
import {
  ClimateLayerId,
  MIN_YEAR,
  MAX_YEAR,
  fbm2D,
  sampleClimatePoint,
} from '../data/climateLayers';
import { rasterizeRealLandMask } from './worldGeography';

const TEX_WIDTH = 2048;
const TEX_HEIGHT = 1024;
const CLOUD_WIDTH = 1536;
const CLOUD_HEIGHT = 768;

// Color stop helpers
function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  const k = Math.max(0, Math.min(1, t));
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * k),
    Math.round(c1[1] + (c2[1] - c1[1]) * k),
    Math.round(c1[2] + (c2[2] - c1[2]) * k),
  ];
}

function rampColor(
  stops: Array<{ t: number; rgb: [number, number, number] }>,
  val: number
): [number, number, number] {
  const v = Math.max(0, Math.min(1, val));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (v >= a.t && v <= b.t) {
      const localT = (v - a.t) / Math.max(0.0001, b.t - a.t);
      return lerpColor(a.rgb, b.rgb, localT);
    }
  }
  return stops[stops.length - 1].rgb;
}

function mountainPeak(
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
  const maxR = Math.max(rLat, rLon) * 2.8;
  if (Math.abs(lat - cLat) > maxR || Math.abs(dLon) > maxR) return 0;
  const dLat = lat - cLat;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const rx = (dLon * cosR - dLat * sinR) / rLon;
  const ry = (dLon * sinR + dLat * cosR) / rLat;
  const d2 = rx * rx + ry * ry;
  return d2 > 7.5 ? 0 : Math.exp(-d2);
}

export interface EarthBaseTextures {
  dayMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  nightLightsMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
}

/**
 * Generates high-detail 2048x1024 Earth textures anchored to real-world
 * Natural Earth 1:50m coastlines, coastal shelves, mountain chains, and biomes.
 */
export function generateEarthBaseTextures(maxAnisotropy: number): EarthBaseTextures {
  // 1. Rasterize exact Natural Earth 1:50m land mask (< 15ms)
  const maskCanvas = rasterizeRealLandMask(TEX_WIDTH, TEX_HEIGHT);
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })!;
  const maskData = maskCtx.getImageData(0, 0, TEX_WIDTH, TEX_HEIGHT).data;

  // 2. Generate blurred coastal distance field on a 512x256 buffer for realistic turquoise shelves
  const shelfSmall = document.createElement('canvas');
  shelfSmall.width = 512;
  shelfSmall.height = 256;
  const shelfSmallCtx = shelfSmall.getContext('2d')!;
  shelfSmallCtx.filter = 'blur(7px)';
  shelfSmallCtx.drawImage(maskCanvas, 0, 0, 512, 256);

  const shelfCanvas = document.createElement('canvas');
  shelfCanvas.width = TEX_WIDTH;
  shelfCanvas.height = TEX_HEIGHT;
  const shelfCtx = shelfCanvas.getContext('2d', { willReadFrequently: true })!;
  shelfCtx.drawImage(shelfSmall, 0, 0, TEX_WIDTH, TEX_HEIGHT);
  const shelfData = shelfCtx.getImageData(0, 0, TEX_WIDTH, TEX_HEIGHT).data;

  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = TEX_WIDTH;
  dayCanvas.height = TEX_HEIGHT;
  const dayCtx = dayCanvas.getContext('2d')!;
  const dayImg = dayCtx.createImageData(TEX_WIDTH, TEX_HEIGHT);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = TEX_WIDTH;
  roughCanvas.height = TEX_HEIGHT;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(TEX_WIDTH, TEX_HEIGHT);

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = TEX_WIDTH;
  normalCanvas.height = TEX_HEIGHT;
  const normalCtx = normalCanvas.getContext('2d')!;
  const normalImg = normalCtx.createImageData(TEX_WIDTH, TEX_HEIGHT);

  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = TEX_WIDTH;
  nightCanvas.height = TEX_HEIGHT;
  const nightCtx = nightCanvas.getContext('2d')!;
  const nightImg = nightCtx.createImageData(TEX_WIDTH, TEX_HEIGHT);

  const heightField = new Float32Array(TEX_WIDTH * TEX_HEIGHT);

  // Real-world major urban corridors for night-side city lights
  const cityHubs: Array<[number, number, number]> = [
    [40.7, -74.0, 9.5], // US Northeast
    [34.0, -118.2, 6.5], // Southern California
    [41.8, -87.6, 7.5], // Great Lakes / Midwest
    [29.7, -95.3, 6.0], // Texas
    [19.4, -99.1, 5.0], // Mexico City
    [-23.5, -46.6, 7.0], // Sao Paulo / Rio
    [-34.6, -58.4, 4.5], // Buenos Aires
    [51.5, 4.0, 9.5], // Western Europe
    [45.4, 11.0, 7.0], // Northern Italy
    [40.4, -3.7, 5.0], // Madrid / Iberia
    [33.6, -7.6, 4.5], // Morocco Atlantic coast
    [36.7, 3.0, 4.5], // Maghreb Mediterranean
    [30.0, 31.2, 6.5], // Nile Delta / Cairo
    [25.2, 55.3, 5.5], // Gulf States
    [28.6, 77.2, 10.5], // Northern India
    [19.0, 72.8, 8.0], // West India
    [31.2, 121.4, 11.5], // East China
    [39.9, 116.4, 9.0], // Beijing
    [22.3, 114.1, 6.5], // Pearl River Delta
    [35.6, 139.7, 7.5], // Tokyo / Honshu
    [37.5, 127.0, 5.5], // Seoul
    [-6.2, 106.8, 5.5], // Java
    [-33.8, 151.2, 4.0], // Sydney
  ];

  for (let y = 0; y < TEX_HEIGHT; y++) {
    const lat = 90 - (y / (TEX_HEIGHT - 1)) * 180;
    const absLat = Math.abs(lat);

    for (let x = 0; x < TEX_WIDTH; x++) {
      const lon = (x / (TEX_WIDTH - 1)) * 360 - 180;
      const idx = y * TEX_WIDTH + x;
      const pIdx = idx * 4;

      const isLand = maskData[pIdx] > 127;
      const detailNoise = fbm2D((lon + 180) * 0.16 + 4.2, (lat + 90) * 0.16 + 1.7, 3);
      const microNoise = fbm2D((lon + 180) * 0.48 + 9.1, (lat + 90) * 0.48 + 3.3, 2);

      if (!isLand) {
        // Real coastal shelf gradient + ocean bathymetric ridges & trenches
        const coastalGlow = shelfData[pIdx] / 255;
        const midAtlanticRidge = mountainPeak(lat, lon, 12, -36, 38, 4.5, -0.18) * 0.42;
        const pacificRise = mountainPeak(lat, lon, -22, -112, 32, 6.0, 0.25) * 0.35;
        const indianRidge = mountainPeak(lat, lon, -22, 68, 22, 5.0, -0.3) * 0.3;
        const bathymetry = detailNoise * 0.28 + microNoise * 0.14 + midAtlanticRidge + pacificRise + indianRidge;

        let rgb = lerpColor([4, 13, 35], [10, 36, 74], bathymetry + coastalGlow * 0.5);
        rgb = lerpColor(rgb, [24, 114, 144], Math.pow(coastalGlow, 1.3) * 0.94);

        dayImg.data[pIdx] = rgb[0];
        dayImg.data[pIdx + 1] = rgb[1];
        dayImg.data[pIdx + 2] = rgb[2];
        dayImg.data[pIdx + 3] = 255;

        const rough = Math.round(38 + detailNoise * 16);
        roughImg.data[pIdx] = rough;
        roughImg.data[pIdx + 1] = rough;
        roughImg.data[pIdx + 2] = rough;
        roughImg.data[pIdx + 3] = 255;

        heightField[idx] = 0;
      } else {
        // Real-world mountain chains & plateaus
        const himalayas = mountainPeak(lat, lon, 32, 85, 5.5, 14, -0.18) * 1.15;
        const andes = mountainPeak(lat, lon, -19, -69, 23, 2.8, 0.08) * 1.0;
        const rockies = mountainPeak(lat, lon, 46, -112, 15, 4.5, -0.25) * 0.82;
        const alps = mountainPeak(lat, lon, 46.5, 10, 2.2, 5.2, 0.15) * 0.74;
        const atlas = mountainPeak(lat, lon, 31.8, -5.5, 2.3, 5.8, 0.28) * 0.68;
        const ethiopia = mountainPeak(lat, lon, 9.5, 39, 4.5, 4.0) * 0.68;
        const urals = mountainPeak(lat, lon, 60, 59, 10, 2.2) * 0.48;

        const elev =
          0.12 +
          detailNoise * 0.18 +
          himalayas +
          andes +
          rockies +
          alps +
          atlas +
          ethiopia +
          urals;

        // Authentic geographical biome regions & major river basins
        const saharaArabia =
          mountainPeak(lat, lon, 23, 14, 10, 28) +
          mountainPeak(lat, lon, 24, 46, 8, 12);
        const gobiCentralAsia = mountainPeak(lat, lon, 42, 92, 7, 16);
        const outback = mountainPeak(lat, lon, -25, 132, 7, 13);
        const southwestUS = mountainPeak(lat, lon, 33, -110, 7, 8);
        const amazonCongo =
          mountainPeak(lat, lon, -4, -61, 10, 14) +
          mountainPeak(lat, lon, 0, 21, 8, 11) +
          mountainPeak(lat, lon, 1, 112, 7, 15);
        const nileValley = mountainPeak(lat, lon, 24, 31.5, 9, 1.4, 0.05) * 0.85;
        const soussSebou = mountainPeak(lat, lon, 33.8, -5.8, 1.8, 2.5, 0.25) * 0.55;

        const tropicalFactor = Math.max(
          0,
          Math.min(1, Math.exp(-Math.pow(lat / 15, 2)) * 0.65 + amazonCongo * 0.75)
        );
        const desertFactor = Math.max(
          0,
          Math.min(
            1,
            saharaArabia * 1.15 + gobiCentralAsia * 0.85 + outback * 0.95 + southwestUS * 0.75 - nileValley - soussSebou
          )
        );
        const borealFactor = Math.max(0, Math.min(1, (absLat - 48) / 16));
        const polarIce =
          lat < -62
            ? 0.95
            : lat > 60 && lon > -65 && lon < -15
            ? 0.92 // Greenland Ice Sheet
            : Math.max(0, Math.min(1, (absLat - 72) / 10));
        const mountainRock = Math.max(0, Math.min(1, (elev - 0.36) / 0.44));
        const alpineSnow = Math.max(0, Math.min(1, (elev - 0.78 + (microNoise - 0.5) * 0.15) / 0.3));

        // Base temperate woodland green
        let rgb = lerpColor([46, 86, 54], [24, 64, 38], tropicalFactor * 0.85 + detailNoise * 0.15);
        // Fertile river valleys
        rgb = lerpColor(rgb, [38, 92, 48], Math.min(1, nileValley + soussSebou * 0.7));
        // Boreal taiga pine
        rgb = lerpColor(rgb, [44, 68, 55], borealFactor * 0.75);
        // Grasslands / savanna variation
        rgb = lerpColor(rgb, [94, 108, 62], Math.max(0, 0.58 - detailNoise) * 0.65);
        // Arid deserts (ochre/terracotta sand with wind noise)
        rgb = lerpColor(
          rgb,
          lerpColor([176, 145, 104], [198, 168, 122], microNoise),
          Math.min(1, desertFactor)
        );
        // Mountain rock & ridge contrast
        rgb = lerpColor(rgb, [106, 98, 90], mountainRock * (0.68 + microNoise * 0.32));
        // Polar & alpine snow
        const snowMask = Math.max(polarIce, alpineSnow);
        rgb = lerpColor(rgb, [234, 241, 249], snowMask);

        dayImg.data[pIdx] = rgb[0];
        dayImg.data[pIdx + 1] = rgb[1];
        dayImg.data[pIdx + 2] = rgb[2];
        dayImg.data[pIdx + 3] = 255;

        const rough = Math.round(lerpColor([228, 0, 0], [108, 0, 0], snowMask)[0]);
        roughImg.data[pIdx] = rough;
        roughImg.data[pIdx + 1] = rough;
        roughImg.data[pIdx + 2] = rough;
        roughImg.data[pIdx + 3] = 255;

        heightField[idx] = Math.min(1.65, elev * 0.9 + microNoise * 0.14);

        // Night lights strictly on real land lowlands
        if (absLat < 63 && elev < 0.72) {
          let cityGlow = 0;
          for (let c = 0; c < cityHubs.length; c++) {
            const [cLat, cLon, rad] = cityHubs[c];
            const dLat = lat - cLat;
            let dLon = lon - cLon;
            if (dLon > 180) dLon -= 360;
            if (dLon < -180) dLon += 360;
            if (Math.abs(dLat) > rad * 1.5 || Math.abs(dLon) > rad * 1.5) continue;
            const distSq = (dLat * dLat + dLon * dLon) / (rad * rad);
            if (distSq < 2.1) {
              cityGlow += Math.exp(-distSq * 2.5);
            }
          }
          if (cityGlow > 0.05) {
            const web = fbm2D((lon + 180) * 0.75, (lat + 90) * 0.75, 2);
            const sparkle = Math.pow(Math.max(0, web - 0.16), 1.4) * 1.85;
            const intensity = Math.max(0, Math.min(1, cityGlow * (0.28 + sparkle)));
            if (intensity > 0.06) {
              nightImg.data[pIdx] = Math.round(255 * intensity);
              nightImg.data[pIdx + 1] = Math.round(192 * intensity);
              nightImg.data[pIdx + 2] = Math.round(104 * intensity);
              nightImg.data[pIdx + 3] = 255;
            }
          }
        }
      }
    }
  }

  // 3. Compute tangent-space Normal Map from real coastlines + mountain elevation
  const strength = 4.5;
  for (let y = 0; y < TEX_HEIGHT; y++) {
    const yUp = Math.max(0, y - 1);
    const yDn = Math.min(TEX_HEIGHT - 1, y + 1);
    for (let x = 0; x < TEX_WIDTH; x++) {
      const xLt = (x - 1 + TEX_WIDTH) % TEX_WIDTH;
      const xRt = (x + 1) % TEX_WIDTH;

      const hL = heightField[y * TEX_WIDTH + xLt];
      const hR = heightField[y * TEX_WIDTH + xRt];
      const hU = heightField[yUp * TEX_WIDTH + x];
      const hD = heightField[yDn * TEX_WIDTH + x];

      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);

      const pIdx = (y * TEX_WIDTH + x) * 4;
      normalImg.data[pIdx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      normalImg.data[pIdx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      normalImg.data[pIdx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      normalImg.data[pIdx + 3] = 255;
    }
  }

  dayCtx.putImageData(dayImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  normalCtx.putImageData(normalImg, 0, 0);
  nightCtx.putImageData(nightImg, 0, 0);

  // 4. Cyclonic Cloud Layer
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = CLOUD_WIDTH;
  cloudCanvas.height = CLOUD_HEIGHT;
  const cloudCtx = cloudCanvas.getContext('2d')!;
  const cloudImg = cloudCtx.createImageData(CLOUD_WIDTH, CLOUD_HEIGHT);

  for (let y = 0; y < CLOUD_HEIGHT; y++) {
    const lat = 90 - (y / (CLOUD_HEIGHT - 1)) * 180;
    const itcz = Math.exp(-Math.pow(lat / 10, 2)) * 0.25;
    const stormTracks = Math.exp(-Math.pow((Math.abs(lat) - 48) / 16, 2)) * 0.32;
    const drySubtropics = Math.exp(-Math.pow((Math.abs(lat) - 24) / 9, 2)) * 0.18;
    const beltFactor = 0.68 + itcz + stormTracks - drySubtropics;

    for (let x = 0; x < CLOUD_WIDTH; x++) {
      const lon = (x / (CLOUD_WIDTH - 1)) * 360 - 180;
      const pIdx = (y * CLOUD_WIDTH + x) * 4;
      const warpX = fbm2D((lon + 180) * 0.045, (lat + 90) * 0.08, 3) * 24;
      const warpY = fbm2D((lon + 180) * 0.05 + 7.4, (lat + 90) * 0.07 + 3.1, 3) * 14;
      const n = fbm2D((lon + 180 + warpX) * 0.065, (lat + 90 + warpY) * 0.12, 3);
      const alpha = Math.max(0, Math.min(1, (n * beltFactor - 0.43) * 2.55));
      cloudImg.data[pIdx] = 242;
      cloudImg.data[pIdx + 1] = 247;
      cloudImg.data[pIdx + 2] = 255;
      cloudImg.data[pIdx + 3] = Math.round(alpha * 175);
    }
  }
  cloudCtx.putImageData(cloudImg, 0, 0);

  const dayMap = new THREE.CanvasTexture(dayCanvas);
  dayMap.colorSpace = THREE.SRGBColorSpace;
  dayMap.anisotropy = maxAnisotropy;
  dayMap.wrapS = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.wrapS = THREE.RepeatWrapping;

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.anisotropy = maxAnisotropy;
  normalMap.wrapS = THREE.RepeatWrapping;

  const nightLightsMap = new THREE.CanvasTexture(nightCanvas);
  nightLightsMap.colorSpace = THREE.SRGBColorSpace;
  nightLightsMap.anisotropy = maxAnisotropy;
  nightLightsMap.wrapS = THREE.RepeatWrapping;

  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.anisotropy = maxAnisotropy;
  cloudMap.wrapS = THREE.RepeatWrapping;

  return {
    dayMap,
    roughnessMap,
    normalMap,
    nightLightsMap,
    cloudMap,
  };
}

/**
 * Generates / updates the climate overlay CanvasTexture aligned to real Natural Earth coastlines
 * and retains its pixel buffer for real-time meridional pixel-scan sonification.
 */
export class ClimateOverlayRenderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly texture: THREE.CanvasTexture;
  public readonly width = 512;
  public readonly height = 256;
  private imageData: ImageData;
  private landMaskData: Uint8ClampedArray;

  constructor(maxAnisotropy: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.imageData = this.ctx.createImageData(this.width, this.height);

    const mask = rasterizeRealLandMask(this.width, this.height);
    this.landMaskData = mask.getContext('2d')!.getImageData(0, 0, this.width, this.height).data;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;
    this.texture.wrapS = THREE.RepeatWrapping;
  }

  public update(layerId: ClimateLayerId, year: number): void {
    const data = this.imageData.data;
    const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);

    for (let y = 0; y < this.height; y++) {
      const lat = 90 - (y / (this.height - 1)) * 180;
      for (let x = 0; x < this.width; x++) {
        const lon = (x / (this.width - 1)) * 360 - 180;
        const pIdx = (y * this.width + x) * 4;
        const isLand = this.landMaskData[pIdx] > 127;
        const sample = sampleClimatePoint(layerId, lat, lon, year, isLand);
        const v = sample.normalized;

        if (layerId === 'temperature') {
          const rgb = rampColor(
            [
              { t: 0.0, rgb: [29, 78, 216] },
              { t: 0.3, rgb: [51, 65, 85] },
              { t: 0.62, rgb: [245, 158, 11] },
              { t: 1.0, rgb: [220, 38, 38] },
            ],
            v
          );
          const alpha = Math.round(Math.min(185, 42 + Math.abs(v - 0.3) * 190));
          data[pIdx] = rgb[0];
          data[pIdx + 1] = rgb[1];
          data[pIdx + 2] = rgb[2];
          data[pIdx + 3] = alpha;
        } else if (layerId === 'seaIce') {
          const rgb = rampColor(
            [
              { t: 0.0, rgb: [15, 23, 42] },
              { t: 0.35, rgb: [2, 132, 199] },
              { t: 0.7, rgb: [125, 211, 252] },
              { t: 1.0, rgb: [248, 250, 252] },
            ],
            v
          );
          data[pIdx] = rgb[0];
          data[pIdx + 1] = rgb[1];
          data[pIdx + 2] = rgb[2];
          data[pIdx + 3] = v > 0.06 ? Math.round(65 + v * 175) : 0;
        } else if (layerId === 'oceanCurrents') {
          if (isLand) {
            data[pIdx] = 15;
            data[pIdx + 1] = 23;
            data[pIdx + 2] = 42;
            data[pIdx + 3] = 0;
          } else {
            const rgb = rampColor(
              [
                { t: 0.0, rgb: [30, 27, 75] },
                { t: 0.42, rgb: [14, 116, 144] },
                { t: 0.72, rgb: [34, 211, 238] },
                { t: 1.0, rgb: [251, 146, 60] },
              ],
              v
            );
            data[pIdx] = rgb[0];
            data[pIdx + 1] = rgb[1];
            data[pIdx + 2] = rgb[2];
            data[pIdx + 3] = Math.round(70 + v * 155);
          }
        } else {
          // wildfiresCarbon
          const rgb = rampColor(
            [
              { t: 0.0, rgb: [30, 41, 59] },
              { t: 0.42, rgb: [124, 45, 18] },
              { t: 0.72, rgb: [245, 158, 11] },
              { t: 1.0, rgb: [244, 63, 94] },
            ],
            v
          );
          const alpha = Math.round(Math.min(200, 25 + t * 50 + Math.pow(v, 1.4) * 175));
          data[pIdx] = rgb[0];
          data[pIdx + 1] = rgb[1];
          data[pIdx + 2] = rgb[2];
          data[pIdx + 3] = alpha;
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
    this.texture.needsUpdate = true;
  }

  public sampleMeridianSlice(lonDeg: number): {
    meanWarmth: number;
    spatialDensity: number;
    northernPeak: number;
    southernPeak: number;
    peakLat: number;
    bands: number[];
  } {
    const normLon = ((((lonDeg + 180) % 360) + 360) % 360) / 360;
    const x = Math.min(this.width - 1, Math.max(0, Math.floor(normLon * (this.width - 1))));
    const data = this.imageData.data;

    let sumWarmth = 0;
    let sumDiff = 0;
    let prevVal = 0;
    let northernPeak = 0;
    let southernPeak = 0;
    let maxIntensity = 0;
    let peakLat = 0;

    const bandCount = 8;
    const bands = new Array<number>(bandCount).fill(0);
    const bandCounts = new Array<number>(bandCount).fill(0);

    const step = 2;
    let samples = 0;

    for (let y = 0; y < this.height; y += step) {
      const pIdx = (y * this.width + x) * 4;
      const r = data[pIdx] / 255;
      const g = data[pIdx + 1] / 255;
      const b = data[pIdx + 2] / 255;
      const a = data[pIdx + 3] / 255;

      const warmth = Math.min(1, (r * 0.65 + g * 0.25 + b * 0.1) * (0.35 + a * 0.65));
      sumWarmth += warmth;

      if (samples > 0) {
        sumDiff += Math.abs(warmth - prevVal);
      }
      prevVal = warmth;

      const lat = 90 - (y / (this.height - 1)) * 180;
      if (lat >= 0 && warmth > northernPeak) northernPeak = warmth;
      if (lat < 0 && warmth > southernPeak) southernPeak = warmth;
      if (warmth > maxIntensity) {
        maxIntensity = warmth;
        peakLat = lat;
      }

      const bIdx = Math.min(bandCount - 1, Math.floor((y / this.height) * bandCount));
      bands[bIdx] += warmth;
      bandCounts[bIdx] += 1;

      samples++;
    }

    for (let i = 0; i < bandCount; i++) {
      bands[i] = bandCounts[i] > 0 ? bands[i] / bandCounts[i] : 0;
    }

    const meanWarmth = samples > 0 ? sumWarmth / samples : 0;
    const spatialDensity = samples > 1 ? Math.min(1, (sumDiff / (samples - 1)) * 6.5) : 0;

    return {
      meanWarmth,
      spatialDensity,
      northernPeak,
      southernPeak,
      peakLat,
      bands,
    };
  }

  public dispose(): void {
    this.texture.dispose();
  }
}
