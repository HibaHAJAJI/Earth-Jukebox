import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CLIMATE_LAYERS,
  ClimateLayerId,
  MAX_YEAR,
  MIN_YEAR,
  ProbedLocation,
  sampleClimatePoint,
} from '../data/climateLayers';
import {
  ClimateOverlayRenderer,
  generateEarthBaseTextures,
} from '../engine/proceduralTextures';
import {
  GLOBE_LABELS,
  createGraticuleGeometry,
  createVectorBordersGeometry,
  identifyPlaceAt,
  latLonToSphereVec3,
} from '../engine/worldGeography';
import { MeridianTelemetry } from '../engine/sonificationEngine';

interface EarthViewportProps {
  activeLayer: ClimateLayerId;
  year: number;
  isPlayingAudio: boolean;
  autoRotate: boolean;
  cameraResetTrigger: number;
  probedLocation: ProbedLocation | null;
  onProbeLocation: (probe: ProbedLocation) => void;
  onScanUpdate: (lonDeg: number, telemetry: MeridianTelemetry) => void;
}

interface HoverReadout {
  placeName: string;
  lat: number;
  lon: number;
  valueText: string;
}

// Pre-allocated math helpers outside render loop (zero per-frame GC)
const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _color = new THREE.Color();

const EARTH_RADIUS = 2.0;
const AXIAL_TILT_RAD = THREE.MathUtils.degToRad(23.44);

// Pre-compute local 3D sphere anchor positions for all globe labels
const LABEL_LOCAL_POSITIONS = GLOBE_LABELS.map((item) =>
  latLonToSphereVec3(item.lat, item.lon, EARTH_RADIUS * 1.018, new THREE.Vector3())
);

export function EarthViewport({
  activeLayer,
  year,
  isPlayingAudio,
  autoRotate,
  cameraResetTrigger,
  probedLocation,
  onProbeLocation,
  onScanUpdate,
}: EarthViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelElsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoverReadout, setHoverReadout] = useState<HoverReadout | null>(null);

  // Mutable refs so React state changes never tear down the WebGL context
  const activeLayerRef = useRef<ClimateLayerId>(activeLayer);
  const yearRef = useRef<number>(year);
  const isPlayingRef = useRef<boolean>(isPlayingAudio);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const onProbeRef = useRef(onProbeLocation);
  const onScanRef = useRef(onScanUpdate);

  activeLayerRef.current = activeLayer;
  yearRef.current = year;
  isPlayingRef.current = isPlayingAudio;
  autoRotateRef.current = autoRotate;
  onProbeRef.current = onProbeLocation;
  onScanRef.current = onScanUpdate;

  // Imperative handles for updating climate texture, atmosphere tint, probe beacon, and camera
  const overlayRef = useRef<ClimateOverlayRenderer | null>(null);
  const atmoUniformsRef = useRef<{ uColor: { value: THREE.Color }; uIntensity: { value: number } } | null>(
    null
  );
  const probeGroupRef = useRef<THREE.Group | null>(null);
  const probeTargetScaleRef = useRef<number>(0);
  const cameraTransitionRef = useRef<{ active: boolean }>({ active: false });

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL via GPU renderer string (never userAgent)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL is unavailable in this browser environment.');
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', 'Interactive 3D Earth Climate Globe');
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D graphics context paused. Restoring viewport...');
    };
    const handleContextRestored = () => {
      setWebglError(null);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // 2. Scene, Fog & Studio Environment Reflection (RoomEnvironment)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.018);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3. Camera & Controls (allow deep close-up country & city zoom)
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 130);
    const defaultCamPos = new THREE.Vector3(0, 1.25, 5.65);
    const defaultSpinY = -1.43;
    camera.position.copy(defaultCamPos);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.minDistance = 2.24;
    controls.maxDistance = 11.0;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.85;

    const cancelCameraTransition = () => {
      cameraTransitionRef.current.active = false;
    };
    controls.addEventListener('start', cancelCameraTransition);

    // 4. Calibrated Three-Point Solar Lighting Rig
    const sunDirection = new THREE.Vector3(5.5, 2.2, 4.8).normalize();
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.65);
    sunLight.position.copy(sunDirection).multiplyScalar(14);
    scene.add(sunLight);

    const hemiFill = new THREE.HemisphereLight(0x7aa2f7, 0x0b1020, 0.55);
    scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-7, -2.5, -6);
    scene.add(rimLight);

    // 5. Procedural Subtly Animated Deep-Space Starfield + Galactic Dust Backdrop
    const starCount = 2600;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starPhases = new Float32Array(starCount);
    const starSpeeds = new Float32Array(starCount);
    const starPalette = [0xf8fafc, 0xbae6fd, 0xfef3c7, 0xc7d2fe, 0xfde68a];

    for (let i = 0; i < starCount; i++) {
      const r = 32 + Math.random() * 46;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      _color.setHex(starPalette[i % starPalette.length]);
      // Slight natural magnitude brightness variation
      const brightness = 0.55 + Math.pow(Math.random(), 2.2) * 0.45;
      starColors[i * 3] = _color.r * brightness;
      starColors[i * 3 + 1] = _color.g * brightness;
      starColors[i * 3 + 2] = _color.b * brightness;

      // Most stars are crisp pinpoints; ~6% are brighter navigational stars
      const isBright = Math.random() > 0.94;
      starSizes[i] = isBright ? 2.6 + Math.random() * 1.8 : 0.8 + Math.random() * 1.3;
      starPhases[i] = Math.random() * Math.PI * 2;
      starSpeeds[i] = 0.6 + Math.random() * 1.4;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    starGeo.setAttribute('aSpeed', new THREE.BufferAttribute(starSpeeds, 1));

    const starUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2) },
    };

    const starMat = new THREE.ShaderMaterial({
      uniforms: starUniforms,
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vColor = aColor;
          vTwinkle = 0.72 + 0.28 * sin(uTime * aSpeed + aPhase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (52.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float core = smoothstep(0.5, 0.04, dist);
          float alpha = pow(core, 1.8) * vTwinkle;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Subtle deep-space Milky Way galactic band sky dome
    const skyGeo = new THREE.SphereGeometry(92, 32, 24);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float noise3(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }
        void main() {
          // Tilted galactic plane
          float plane = abs(vDir.y * 0.78 + vDir.x * 0.45 - vDir.z * 0.42);
          float band = exp(-plane * 5.2);
          float dust = noise3(vDir * 6.0) * 0.65 + noise3(vDir * 13.0) * 0.35;
          vec3 baseSpace = vec3(0.027, 0.035, 0.055);
          vec3 galacticGlow = vec3(0.065, 0.095, 0.165) * band * dust;
          gl_FragColor = vec4(baseSpace + galacticGlow, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // 6. Composite Multi-Part 3D Earth Assembly (THREE.Group)
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const baseTextures = generateEarthBaseTextures(maxAnisotropy);
    const climateOverlay = new ClimateOverlayRenderer(maxAnisotropy);
    climateOverlay.update(activeLayerRef.current, yearRef.current);
    overlayRef.current = climateOverlay;

    const tiltAxisGroup = new THREE.Group();
    tiltAxisGroup.rotation.z = AXIAL_TILT_RAD;
    scene.add(tiltAxisGroup);

    const earthSpinGroup = new THREE.Group();
    // Initial rotation facing unified Morocco, North Africa, Europe, and the Atlantic
    earthSpinGroup.rotation.y = defaultSpinY;
    tiltAxisGroup.add(earthSpinGroup);

    // Part A: Core Planetary Surface with PBR Normal Map, Twilight Scattering & Night City Lights
    const surfaceGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 64);
    const surfaceMat = new THREE.MeshStandardMaterial({
      map: baseTextures.dayMap,
      roughnessMap: baseTextures.roughnessMap,
      normalMap: baseTextures.normalMap,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.88,
      metalness: 0.06,
    });

    surfaceMat.onBeforeCompile = (shader) => {
      shader.uniforms.uNightMap = { value: baseTextures.nightLightsMap };
      shader.uniforms.uSunDir = { value: sunDirection };

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vWorldNormalCity;
           varying vec2 vCityUv;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vCityUv = uv;
           vWorldNormalCity = normalize(mat3(modelMatrix) * normal);`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform sampler2D uNightMap;
           uniform vec3 uSunDir;
           varying vec3 vWorldNormalCity;
           varying vec2 vCityUv;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float sunAlignment = dot(normalize(vWorldNormalCity), normalize(uSunDir));
           float nightFactor = smoothstep(0.10, -0.24, sunAlignment);
           float twilightBand = exp(-pow((sunAlignment - 0.01) / 0.14, 2.0));
           vec3 cityLights = texture2D(uNightMap, vCityUv).rgb;
           totalEmissiveRadiance += cityLights * nightFactor * 1.25;
           totalEmissiveRadiance += vec3(0.24, 0.09, 0.03) * twilightBand * 0.25;`
        );
    };

    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.name = 'earth-surface';
    earthSpinGroup.add(surfaceMesh);

    // Part B: Climate Data Overlay Shell (balanced opacity so countries & coasts stay legible)
    const climateGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.005, 96, 64);
    const climateMat = new THREE.MeshStandardMaterial({
      map: climateOverlay.texture,
      transparent: true,
      opacity: 0.48,
      roughness: 0.65,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      depthWrite: false,
    });
    const climateMesh = new THREE.Mesh(climateGeo, climateMat);
    climateMesh.renderOrder = 1;
    earthSpinGroup.add(climateMesh);

    // Part B2: 3D Vector Natural Earth Country Borders & Coastlines (razor-sharp at any zoom)
    const { bordersGeo, coastsGeo } = createVectorBordersGeometry(EARTH_RADIUS * 1.0075);
    const bordersMat = new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const bordersLines = new THREE.LineSegments(bordersGeo, bordersMat);
    bordersLines.renderOrder = 2;
    earthSpinGroup.add(bordersLines);

    const coastsMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const coastsLines = new THREE.LineSegments(coastsGeo, coastsMat);
    coastsLines.renderOrder = 2;
    earthSpinGroup.add(coastsLines);

    // Part B3: Subtle 30-degree scientific latitude/longitude graticule lines
    const graticuleGeo = createGraticuleGeometry(EARTH_RADIUS * 1.0065);
    const graticuleMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    const graticuleLines = new THREE.LineSegments(graticuleGeo, graticuleMat);
    graticuleLines.renderOrder = 2;
    earthSpinGroup.add(graticuleLines);

    // Part C: Dynamic Cloud Layer (independent drift)
    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.016, 64, 42);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: baseTextures.cloudMap,
      transparent: true,
      opacity: 0.42,
      roughness: 0.9,
      metalness: 0.0,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.renderOrder = 2;
    earthSpinGroup.add(cloudMesh);

    // Part D: Volumetric Atmospheric Limb Glow (Fresnel Shader)
    const atmoUniforms = {
      uColor: { value: new THREE.Color(CLIMATE_LAYERS[activeLayerRef.current].accentHex) },
      uIntensity: { value: 0.72 },
    };
    atmoUniformsRef.current = atmoUniforms;

    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.085, 64, 42);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: atmoUniforms,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 viewDir = normalize(vViewPos);
          float rim = pow(0.68 - dot(vNormal, viewDir), 3.2);
          vec3 skyBlue = vec3(0.22, 0.68, 0.98);
          vec3 col = mix(skyBlue, uColor, 0.32);
          gl_FragColor = vec4(col, clamp(rim * uIntensity, 0.0, 0.85));
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.renderOrder = 3;
    tiltAxisGroup.add(atmoMesh);

    // Part E: Orbital Sonification Scan Ring & Meridian Sweep
    const scannerGroup = new THREE.Group();
    earthSpinGroup.add(scannerGroup);

    const meridianRingGeo = new THREE.TorusGeometry(EARTH_RADIUS * 1.045, 0.0085, 12, 96);
    const meridianRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.8,
      transparent: true,
      opacity: 0.52,
    });
    const meridianRing = new THREE.Mesh(meridianRingGeo, meridianRingMat);
    meridianRing.rotation.y = Math.PI / 2;
    scannerGroup.add(meridianRing);

    // Subtle equatorial orbital telemetry ring around Earth
    const orbitRingGeo = new THREE.TorusGeometry(EARTH_RADIUS * 1.32, 0.006, 10, 128);
    const orbitRingMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
      transparent: true,
      opacity: 0.35,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2;
    tiltAxisGroup.add(orbitRing);

    // Part F: Composite 3-Part Surface Probe Beacon (Ring + Stem + Tip)
    const probeGroup = new THREE.Group();
    probeGroup.scale.setScalar(0.001);
    probeGroup.visible = false;

    const beaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.008, 10, 32),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.7,
      })
    );
    beaconRing.rotation.x = Math.PI / 2;
    probeGroup.add(beaconRing);

    const beaconStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.012, 0.16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.25,
        metalness: 0.85,
      })
    );
    beaconStem.position.y = 0.08;
    probeGroup.add(beaconStem);

    const beaconTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.0,
        roughness: 0.15,
        metalness: 0.3,
      })
    );
    beaconTip.position.y = 0.17;
    probeGroup.add(beaconTip);

    const beaconWaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beaconWaveRing = new THREE.Mesh(
      new THREE.RingGeometry(0.072, 0.088, 36),
      beaconWaveMat
    );
    beaconWaveRing.rotation.x = Math.PI / 2;
    beaconWaveRing.position.y = 0.004;
    probeGroup.add(beaconWaveRing);

    earthSpinGroup.add(probeGroup);
    probeGroupRef.current = probeGroup;

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Pointer Raycasting for Surface Probing & Throttled Live Hover Country Readout
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastHoverCheck = 0;

    const extractHitLatLon = (hit: THREE.Intersection) => {
      _vec3.copy(hit.point);
      earthSpinGroup.worldToLocal(_vec3);
      const r = _vec3.length();
      const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(_vec3.y / r, -1, 1)));
      const uv = hit.uv;
      const lon = uv ? uv.x * 360 - 180 : THREE.MathUtils.radToDeg(Math.atan2(-_vec3.z, _vec3.x));
      return { lat, lon };
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 85) return;
      lastHoverCheck = now;

      const rect = canvas.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(surfaceMesh, false);
      if (hits.length === 0) {
        setHoverReadout((prev) => (prev ? null : prev));
        return;
      }

      const { lat, lon } = extractHitLatLon(hits[0]);
      const { placeName } = identifyPlaceAt(lat, lon);
      const sample = sampleClimatePoint(activeLayerRef.current, lat, lon, yearRef.current);
      setHoverReadout({
        placeName,
        lat,
        lon,
        valueText: sample.formattedValue,
      });
    };

    const handlePointerLeave = () => {
      setHoverReadout(null);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownX;
      const dy = e.clientY - pointerDownY;
      if (dx * dx + dy * dy > 36) return; // Ignore orbit drag

      const rect = canvas.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObject(surfaceMesh, false);
      if (hits.length === 0) return;

      const { lat, lon } = extractHitLatLon(hits[0]);

      // Place probe beacon flush on surface normal
      _hitNormal.copy(_vec3).normalize();
      probeGroup.position.copy(_hitNormal).multiplyScalar(EARTH_RADIUS * 1.006);
      probeGroup.quaternion.setFromUnitVectors(_upVec, _hitNormal);
      probeGroup.visible = true;
      probeTargetScaleRef.current = 1.0;

      const sample = sampleClimatePoint(activeLayerRef.current, lat, lon, yearRef.current);
      onProbeRef.current({
        lat,
        lon,
        regionName: sample.regionName,
        normalizedValue: sample.normalized,
        formattedValue: sample.formattedValue,
        narrative: sample.narrative,
      });
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('pointerup', handlePointerUp);

    // 8. Resize Handling
    let viewWidth = width;
    let viewHeight = height;
    const handleResize = () => {
      if (!container) return;
      viewWidth = container.clientWidth || window.innerWidth;
      viewHeight = container.clientHeight || window.innerHeight;
      camera.aspect = viewWidth / viewHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(viewWidth, viewHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop with Elapsed-Time Kinematics & Software-WebGL Pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let scanAngleRad = 0;
    let lastTelemetryPush = 0;
    let currentProbeScale = 0.001;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Subtle procedural starfield twinkle and slow celestial drift
      starUniforms.uTime.value = now * 0.001;
      starField.rotation.y += delta * 0.004;
      starField.rotation.x += delta * 0.0012;

      // Keep Earth and clouds stationary until timer/spin is activated
      if (autoRotateRef.current) {
        earthSpinGroup.rotation.y += delta * 0.065;
        cloudMesh.rotation.y += delta * 0.022;
      }

      // Sweep orbital scan meridian only when audio or rotation is active
      if (isPlayingRef.current || autoRotateRef.current) {
        const scanSpeed = isPlayingRef.current ? 0.42 : 0.12;
        scanAngleRad = (scanAngleRad + delta * scanSpeed) % (Math.PI * 2);
        scannerGroup.rotation.y = scanAngleRad;
      }

      // Smoothly brighten scan ring when playing audio
      const targetRingOpacity = isPlayingRef.current ? 0.88 : 0.34;
      meridianRingMat.opacity = THREE.MathUtils.damp(
        meridianRingMat.opacity,
        targetRingOpacity,
        6,
        delta
      );

      // Smoothly damp probe beacon pop-in and animate 3D surface pulse ring
      if (probeGroup.visible) {
        currentProbeScale = THREE.MathUtils.damp(
          currentProbeScale,
          probeTargetScaleRef.current,
          10,
          delta
        );
        probeGroup.scale.setScalar(currentProbeScale);
        const wavePhase = (now * 0.00095) % 1;
        const waveScale = 0.85 + wavePhase * 1.9;
        beaconWaveRing.scale.setScalar(waveScale);
        beaconWaveMat.opacity = (1 - wavePhase) * 0.55;
      }

      // Smooth camera reset transition (returns to Morocco & Atlantic framing)
      if (cameraTransitionRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, defaultCamPos.x, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, defaultCamPos.y, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, defaultCamPos.z, 5, delta);
        earthSpinGroup.rotation.y = THREE.MathUtils.damp(
          earthSpinGroup.rotation.y,
          defaultSpinY,
          5,
          delta
        );
        if (
          camera.position.distanceTo(defaultCamPos) < 0.02 &&
          Math.abs(earthSpinGroup.rotation.y - defaultSpinY) < 0.01
        ) {
          camera.position.copy(defaultCamPos);
          earthSpinGroup.rotation.y = defaultSpinY;
          cameraTransitionRef.current.active = false;
        }
      }

      // Adaptive rotation speed, graticule & country border visibility based on zoom distance
      const camDist = camera.position.length();
      controls.rotateSpeed = THREE.MathUtils.clamp((camDist - 1.95) * 0.17, 0.14, 0.72);
      bordersMat.opacity = THREE.MathUtils.clamp(0.2 + (5.8 - camDist) * 0.09, 0.2, 0.54);
      coastsMat.opacity = THREE.MathUtils.clamp(0.18 + (5.8 - camDist) * 0.065, 0.18, 0.44);
      graticuleMat.opacity = THREE.MathUtils.clamp(0.05 + (5.6 - camDist) * 0.03, 0.05, 0.16);

      controls.update();
      renderer.render(scene, camera);

      // Project zoom-aware continent/ocean/country/city labels directly via DOM transforms
      earthSpinGroup.updateMatrixWorld(true);
      for (let i = 0; i < GLOBE_LABELS.length; i++) {
        const el = labelElsRef.current[i];
        if (!el) continue;

        const spec = GLOBE_LABELS[i];
        let tierAlpha = 0;
        if (spec.tier === 'continent' || spec.tier === 'ocean') {
          tierAlpha = THREE.MathUtils.clamp((camDist - 2.9) / 1.4, 0, 1);
        } else if (spec.tier === 'majorCountry') {
          tierAlpha = THREE.MathUtils.clamp((5.7 - camDist) / 1.3, 0, 1);
        } else if (spec.tier === 'country') {
          tierAlpha = THREE.MathUtils.clamp((3.7 - camDist) / 0.9, 0, 1);
        } else {
          // City landmarks appear when zoomed in close
          tierAlpha = THREE.MathUtils.clamp((3.2 - camDist) / 0.65, 0, 1);
        }

        if (tierAlpha <= 0.02) {
          el.style.opacity = '0';
          continue;
        }

        _vec3.copy(LABEL_LOCAL_POSITIONS[i]).applyMatrix4(earthSpinGroup.matrixWorld);
        // Surface normal in world space = normalized world position (Earth centered at origin)
        _hitNormal.copy(_vec3).normalize();
        _vec3B.copy(camera.position).sub(_vec3).normalize();
        const facing = _hitNormal.dot(_vec3B);

        if (facing < 0.28) {
          el.style.opacity = '0';
          continue;
        }

        _vec3.project(camera);
        if (_vec3.z > 1) {
          el.style.opacity = '0';
          continue;
        }

        const sx = ((_vec3.x + 1) * 0.5) * viewWidth;
        const sy = ((-_vec3.y + 1) * 0.5) * viewHeight;
        const facingFade = THREE.MathUtils.smoothstep(facing, 0.28, 0.55);
        el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
        el.style.opacity = (tierAlpha * facingFade * 0.88).toFixed(2);
      }

      // Sample climate pixel slice beneath the scan meridian at ~15 Hz for audio + telemetry
      if (now - lastTelemetryPush > 66 && overlayRef.current) {
        lastTelemetryPush = now;
        const lonDeg = ((THREE.MathUtils.radToDeg(scanAngleRad) + 180) % 360) - 180;
        const telemetry = overlayRef.current.sampleMeridianSlice(lonDeg);
        onScanRef.current(lonDeg, telemetry);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.removeEventListener('start', cancelCameraTransition);
      controls.dispose();

      surfaceGeo.dispose();
      surfaceMat.dispose();
      climateGeo.dispose();
      climateMat.dispose();
      bordersGeo.dispose();
      bordersMat.dispose();
      coastsGeo.dispose();
      coastsMat.dispose();
      graticuleGeo.dispose();
      graticuleMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      meridianRingGeo.dispose();
      meridianRingMat.dispose();
      orbitRingGeo.dispose();
      orbitRingMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      beaconRing.geometry.dispose();
      beaconStem.geometry.dispose();
      beaconTip.geometry.dispose();
      beaconWaveRing.geometry.dispose();
      beaconWaveMat.dispose();

      baseTextures.dayMap.dispose();
      baseTextures.roughnessMap.dispose();
      baseTextures.normalMap.dispose();
      baseTextures.nightLightsMap.dispose();
      baseTextures.cloudMap.dispose();
      climateOverlay.dispose();
      envTexture.dispose();

      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  // Update climate layer texture & atmospheric accent whenever activeLayer or year changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.update(activeLayer, year);
    }
    if (atmoUniformsRef.current) {
      const spec = CLIMATE_LAYERS[activeLayer];
      atmoUniformsRef.current.uColor.value.set(spec.accentHex);
      const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
      atmoUniformsRef.current.uIntensity.value = 0.65 + t * 0.28;
    }
  }, [activeLayer, year]);

  // Trigger smooth camera reset when requested
  useEffect(() => {
    if (cameraResetTrigger > 0) {
      cameraTransitionRef.current.active = true;
    }
  }, [cameraResetTrigger]);

  // Hide probe beacon if cleared
  useEffect(() => {
    if (!probedLocation && probeGroupRef.current) {
      probeTargetScaleRef.current = 0.001;
      probeGroupRef.current.visible = false;
    }
  }, [probedLocation]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair focus:outline-none"
        tabIndex={0}
        aria-label="3D Earth Observatory viewport. Drag to rotate, scroll to zoom, click any country or ocean to sample climate data and sound."
      />

      {/* Projected Geographic Continent, Ocean & Country Labels */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none"
      >
        {GLOBE_LABELS.map((item, idx) => (
          <span
            key={`${item.tier}-${item.name}`}
            ref={(el) => {
              labelElsRef.current[idx] = el;
            }}
            style={{ opacity: 0 }}
            className={`absolute top-0 left-0 whitespace-nowrap leading-none tracking-wide ${
              item.tier === 'ocean'
                ? 'text-[10px] font-medium italic text-sky-300/75 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
                : item.tier === 'continent'
                ? 'text-[11px] font-semibold text-slate-100/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]'
                : item.tier === 'majorCountry'
                ? 'text-[11px] font-medium text-slate-100/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]'
                : item.tier === 'city'
                ? 'flex items-center gap-1 text-[10px] font-medium text-amber-200/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.98)]'
                : 'text-[10px] font-normal text-slate-200/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]'
            }`}
          >
            {item.tier === 'city' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 border border-slate-950" />
            )}
            <span>{item.name}</span>
          </span>
        ))}
      </div>

      {/* Discreet Live Hover Location & Coordinate Strip */}
      {hoverReadout && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-[58px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-xs text-slate-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] whitespace-nowrap"
        >
          <span className="font-medium text-slate-100">{hoverReadout.placeName}</span>
          <span className="text-slate-500">·</span>
          <span className="font-mono tabular-nums text-slate-400">
            {Math.abs(hoverReadout.lat).toFixed(1)}°{hoverReadout.lat >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(hoverReadout.lon).toFixed(1)}°{hoverReadout.lon >= 0 ? 'E' : 'W'}
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-mono tabular-nums text-sky-300">{hoverReadout.valueText}</span>
        </div>
      )}

      {webglError && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-[#07090E] p-6 text-center"
        >
          <div className="max-w-md rounded-xl border border-slate-800 bg-[#0B0F19] p-6">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              3D Globe Renderer Unavailable
            </h2>
            <p className="mt-2 text-sm text-slate-400">{webglError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
