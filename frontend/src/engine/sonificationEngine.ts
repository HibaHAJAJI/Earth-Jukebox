import { AudioMode, ClimateLayerId } from '../data/climateLayers';

export interface MeridianTelemetry {
  meanWarmth: number;
  spatialDensity: number;
  northernPeak: number;
  southernPeak: number;
  peakLat: number;
  bands: number[];
}

// Lydian & minor-9th pentatonic ratios (A2 = 110 Hz root)
const COOL_RATIOS = [1, 1.5, 2.25, 2.5, 3.375, 4.5]; // A2, E3, B3, C#4, F#4, B4
const WARM_RATIOS = [1, 1.5, 2.0, 2.375, 3.0, 3.5625]; // A2, E3, A3, C4, E4, G4 (poignant)
const CHIME_SCALE_HZ = [220, 246.94, 293.66, 329.63, 392.0, 440, 493.88, 587.33, 659.25];

export class EarthSonificationEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Ambient Musical Nodes
  private padFilter: BiquadFilterNode | null = null;
  private padGain: GainNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  // State
  private isPlaying = false;
  private isDucked = false;
  private mode: AudioMode = 'ambient';
  private volume = 0.65;
  private layerId: ClimateLayerId = 'temperature';
  private lastChimeTime = 0;
  private lastScanStepTime = 0;
  private scanBandIndex = 0;
  private latestTelemetry: MeridianTelemetry = {
    meanWarmth: 0.35,
    spatialDensity: 0.25,
    northernPeak: 0.4,
    southernPeak: 0.3,
    peakLat: 20,
    bands: [0.3, 0.35, 0.4, 0.35, 0.3, 0.25, 0.2, 0.25],
  };

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.015;
      this.compressor.release.value = 0.22;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.82;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;

      // Subtle atmospheric stereo echo bus
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.38;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.28;
      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1600;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      delayFilter.connect(this.compressor);

      this.compressor.connect(this.analyser);
      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setupAmbientBed();
    }
    return this.ctx;
  }

  private setupAmbientBed(): void {
    if (!this.ctx || !this.compressor || !this.delayNode) return;

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 480;
    this.padFilter.Q.value = 0.9;

    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0.26;

    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.compressor);
    this.padGain.connect(this.delayNode);

    const rootHz = 110; // A2
    const waveTypes: OscillatorType[] = ['sine', 'triangle', 'sine', 'triangle', 'sine'];

    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = waveTypes[i];
      osc.frequency.value = rootHz * COOL_RATIOS[i];
      osc.detune.value = (i - 2) * 3.5;

      const voiceGain = this.ctx.createGain();
      voiceGain.gain.value = i === 0 ? 0.34 : 0.16;

      osc.connect(voiceGain);
      voiceGain.connect(this.padFilter);
      osc.start();
      this.padOscs.push(osc);
    }

    // Filtered pink-noise ocean/wind bed
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 340;
    this.noiseFilter.Q.value = 0.85;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.18;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.compressor);
    this.noiseSource.start();
  }

  private getEffectiveGain(): number {
    return this.volume * 0.85 * (this.isDucked ? 0.35 : 1.0);
  }

  public setAgentDucking(ducking: boolean): void {
    this.isDucked = ducking;
    if (this.ctx && this.masterGain && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(this.getEffectiveGain(), this.ctx.currentTime, 0.14);
    }
  }

  public async setPlaying(playing: boolean): Promise<void> {
    this.isPlaying = playing;
    if (playing) {
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (this.masterGain) {
        const now = ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(this.getEffectiveGain(), now, 0.25);
      }
      this.applyModeMix();
    } else if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.18);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(this.getEffectiveGain(), this.ctx.currentTime, 0.08);
    }
  }

  public setMode(mode: AudioMode): void {
    this.mode = mode;
    this.applyModeMix();
  }

  public setLayer(layerId: ClimateLayerId): void {
    this.layerId = layerId;
    this.applyModeMix();
  }

  private applyModeMix(): void {
    if (!this.ctx || !this.padGain || !this.noiseGain) return;
    const now = this.ctx.currentTime;
    if (this.mode === 'ambient') {
      this.padGain.gain.setTargetAtTime(0.28, now, 0.2);
      this.noiseGain.gain.setTargetAtTime(0.18, now, 0.2);
    } else {
      // Quiet the ambient pad in Pixel Scan mode so data pulses stand out clearly
      this.padGain.gain.setTargetAtTime(0.09, now, 0.2);
      this.noiseGain.gain.setTargetAtTime(0.07, now, 0.2);
    }
  }

  /**
   * Called continuously from the animation loop with the live meridional pixel slice
   * beneath the rotating scan ring.
   */
  public updateTelemetry(telemetry: MeridianTelemetry, yearProgress: number): void {
    this.latestTelemetry = telemetry;
    if (!this.ctx || !this.isPlaying) return;

    const now = this.ctx.currentTime;
    const { meanWarmth, spatialDensity, northernPeak, southernPeak, peakLat, bands } = telemetry;

    // 1. Update pad harmonic voicing (cool baseline -> warm tension)
    const tension = Math.max(0, Math.min(1, meanWarmth * 0.65 + yearProgress * 0.45));
    const baseRoot =
      this.layerId === 'seaIce'
        ? 130.81 // C3 crisp polar register
        : this.layerId === 'oceanCurrents'
        ? 98.0 // G2 deep oceanic register
        : 110.0; // A2

    for (let i = 0; i < this.padOscs.length; i++) {
      const ratio =
        COOL_RATIOS[i] * (1 - tension) + WARM_RATIOS[i] * tension;
      this.padOscs[i].frequency.setTargetAtTime(baseRoot * ratio, now, 0.35);
    }

    if (this.padFilter) {
      const cutoff = 320 + meanWarmth * 950 + spatialDensity * 380;
      this.padFilter.frequency.setTargetAtTime(cutoff, now, 0.25);
    }

    if (this.noiseFilter) {
      const windFreq = 240 + spatialDensity * 680;
      this.noiseFilter.frequency.setTargetAtTime(windFreq, now, 0.25);
    }

    // 2. Ambient Mode: trigger delicate melodic chimes when scanning hotspots
    if (this.mode === 'ambient') {
      const interval = Math.max(0.45, 1.35 - spatialDensity * 0.75);
      if (now - this.lastChimeTime > interval && (northernPeak > 0.42 || southernPeak > 0.42)) {
        this.lastChimeTime = now;
        const peakVal = Math.max(northernPeak, southernPeak);
        const pan = Math.max(-0.85, Math.min(0.85, peakLat / 90));
        this.triggerMelodicChime(peakVal, pan, 0.14);
      }
    } else {
      // 3. Pixel Scan Mode: step through the 8 latitude bands from North to South
      const stepPeriod = Math.max(0.14, 0.32 - spatialDensity * 0.16);
      if (now - this.lastScanStepTime > stepPeriod) {
        this.lastScanStepTime = now;
        const bandVal = bands[this.scanBandIndex] ?? 0.25;
        const latNorm = 1 - (this.scanBandIndex / Math.max(1, bands.length - 1)) * 2; // +1 N to -1 S
        this.triggerPixelScanPulse(bandVal, latNorm * 0.8);
        this.scanBandIndex = (this.scanBandIndex + 1) % bands.length;
      }
    }
  }

  private triggerMelodicChime(intensity: number, pan: number, gainAmt: number): void {
    if (!this.ctx || !this.compressor || !this.delayNode) return;
    const now = this.ctx.currentTime;
    const scaleIdx = Math.min(
      CHIME_SCALE_HZ.length - 1,
      Math.max(0, Math.floor(intensity * CHIME_SCALE_HZ.length))
    );
    const freq = CHIME_SCALE_HZ[scaleIdx] * (this.layerId === 'seaIce' ? 1.5 : 1.0);

    const osc = this.ctx.createOscillator();
    osc.type = this.layerId === 'wildfiresCarbon' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gainAmt, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);

    osc.connect(env);
    env.connect(panner);
    panner.connect(this.compressor);
    panner.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + 1.65);
  }

  private triggerPixelScanPulse(bandIntensity: number, pan: number): void {
    if (!this.ctx || !this.compressor || !this.delayNode) return;
    const now = this.ctx.currentTime;

    // Map pixel warmth to quantized harmonic steps (clean, non-fatiguing data synth)
    const idx = Math.min(
      CHIME_SCALE_HZ.length - 1,
      Math.max(0, Math.floor(bandIntensity * CHIME_SCALE_HZ.length))
    );
    const freq = CHIME_SCALE_HZ[idx] * (bandIntensity > 0.65 ? 1.5 : 0.75);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600 + bandIntensity * 1800, now);

    const env = this.ctx.createGain();
    const amp = 0.05 + bandIntensity * 0.14;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(amp, now + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);

    osc.connect(filter);
    filter.connect(env);
    env.connect(panner);
    panner.connect(this.compressor);
    panner.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  /**
   * Plays an immediate localized harmonic probe tone when the user clicks a point on Earth.
   */
  public async playProbeChime(normalizedIntensity: number, lat: number): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (this.masterGain && !this.isPlaying) {
      // Temporarily open master gain softly so surface click feedback is still audible
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.volume * 0.75, now, 0.03);
      this.masterGain.gain.setTargetAtTime(0.0001, now + 1.1, 0.3);
    }
    const pan = Math.max(-0.8, Math.min(0.8, lat / 90));
    this.triggerMelodicChime(normalizedIntensity, pan, 0.22);
    // Add an octave overtone for clarity
    this.triggerMelodicChime(Math.min(1, normalizedIntensity + 0.25), pan * 0.5, 0.1);
  }

  public getWaveformData(target: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser || !this.isPlaying) return false;
    this.analyser.getByteTimeDomainData(target);
    return true;
  }

  public getLatestTelemetry(): MeridianTelemetry {
    return this.latestTelemetry;
  }

  public dispose(): void {
    this.padOscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // ignore if already stopped
      }
    });
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {
        // ignore
      }
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

const SPEECH_LOCALE: Record<'en' | 'fr' | 'ar', string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar-SA',
};

export function speakNarration(
  text: string,
  enabled: boolean,
  lang: 'en' | 'fr' | 'ar' = 'en',
  onEnd?: () => void
): void {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALE[lang];
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

export function stopNarration(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
