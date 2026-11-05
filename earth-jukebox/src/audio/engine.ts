/* ------------------------------------------------------------------ */
/*  Earth Jukebox — real-time sonification engine                      */
/*  Translates pixel columns of an EIC frame into a living score:      */
/*  hue→pitch (snapped to a pentatonic field), lightness→register,     */
/*  saturation→velocity, horizontal axis→time, regional hue→harmony.    */
/*  Everything is synthesized with the Web Audio API — zero samples.   */
/* ------------------------------------------------------------------ */

import {
  Features,
  ColumnFeat,
  MINOR_PENT_EXT,
  MAJOR_PENT_EXT,
  midiToFreq,
  noteName,
  pcName,
} from "./analysis";
import type { Track } from "../data/tracks";

export interface Readout {
  scan: number;
  region: number;
  melody: string | null;
  chord: string;
}

const COLS = 160;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

class Engine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetGain: GainNode | null = null;
  private delay: DelayNode | null = null;
  private delayFb: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  private raf = 0;
  private lastT = 0;
  private nextStepTime = 0;
  private stepIdx = 0;
  private lastMelCol = 0;
  private lastReadoutAt = 0;

  /** recent pad voices so we can fade them out on chord change */
  private padVoices: { gain: GainNode; oscs: OscillatorNode[] }[] = [];

  features: Features | null = null;
  track: Track | null = null;
  playing = false;
  rhythm = true;
  volume = 0.85;
  private muted = false;
  scan = 0;

  private currentRegion = -1;
  private currentMelody: string | null = null;
  private currentMelodyUntil = 0;

  onScan: ((scan: number) => void) | null = null;
  onReadout: ((r: Readout) => void) | null = null;

  /* ---------------- graph construction ---------------- */

  private ensureGraph() {
    if (this.ctx) return;
    const Ctor: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.24;
    this.comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.comp);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.84;
    this.master.connect(this.analyser);

    // noise buffer
    const nlen = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    // generative reverb — exponential-decay noise IR, no samples needed
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this.makeImpulse(2.7, 3.1);
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0.34;
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.master);

    // dotted-eighth feedback delay with tape-ish lowpass in the loop
    this.delay = ctx.createDelay(2.0);
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.36;
    const delayLp = ctx.createBiquadFilter();
    delayLp.type = "lowpass";
    delayLp.frequency.value = 1750;
    delayLp.Q.value = 0.7;
    this.delay.connect(delayLp);
    delayLp.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0.22;
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.master);
    this.delay.connect(this.convolver); // echoes bloom into the hall
  }

  private makeImpulse(dur: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /* ---------------- transport ---------------- */

  load(track: Track, features: Features) {
    this.track = track;
    this.features = features;
    this.scan = 0;
    this.lastMelCol = 0;
    this.currentRegion = -1;
    this.currentMelody = null;
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.stepIdx = 0;
    this.nextStepTime = now + 0.12;
    if (this.delay && this.track) {
      this.delay.delayTime.value = (60 / this.track.groove.bpm) * 0.75;
    }
    if (this.ctx && this.playing) {
      this.fadePads(0.25);
    }
  }

  play() {
    this.ensureGraph();
    const ctx = this.ctx!;
    void ctx.resume();
    if (this.playing) return;
    this.playing = true;
    const now = ctx.currentTime;
    this.lastT = now;
    this.nextStepTime = Math.max(this.nextStepTime, now + 0.1);
    this.currentRegion = -1;
    this.tick();
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    if (this.ctx) void this.ctx.suspend();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  setVolume(v: number) {
    this.volume = clamp01(v);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
  }

  isMuted() {
    return this.muted;
  }

  setRhythm(on: boolean) {
    this.rhythm = on;
  }

  /* ---------------- main loop ---------------- */

  private tick = () => {
    if (!this.playing || !this.ctx || !this.track || !this.features) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dt = Math.max(0, now - this.lastT);
    this.lastT = now;

    // advance beam
    this.scan = (this.scan + dt / this.track.groove.sweepSec) % 1;

    // schedule 16th steps with a small lookahead
    const stepDur = 60 / this.track.groove.bpm / 4;
    let guard = 0;
    while (this.nextStepTime <= now + 0.15 && guard++ < 64) {
      this.scheduleStep(this.stepIdx, this.nextStepTime, stepDur);
      this.stepIdx += 1;
      this.nextStepTime += stepDur;
    }

    // harmony follows geography: 4 regions across the frame
    const region = Math.min(3, Math.floor(this.scan * 4));
    if (region !== this.currentRegion) {
      this.currentRegion = region;
      this.firePad(region);
    }

    // beam + readout callbacks
    this.onScan?.(this.scan);
    if (now - this.lastReadoutAt > 0.15) {
      this.lastReadoutAt = now;
      this.onReadout?.({
        scan: this.scan,
        region,
        melody: now < this.currentMelodyUntil ? this.currentMelody : null,
        chord: this.chordLabel(region),
      });
    }

    this.raf = requestAnimationFrame(this.tick);
  };

  /* ---------------- step sequencer ---------------- */

  private scheduleStep(globalStep: number, t: number, stepDur: number) {
    const track = this.track!;
    const f = this.features!;
    const s = globalStep % 16;
    const g = track.groove;

    // --- rhythm section (toggleable) ---
    if (this.rhythm) {
      if (g.hat === "sixteenths" || (g.hat === "eighths" && s % 2 === 0)) {
        this.hat(t, s % 4 === 0 ? 0.32 : 0.18);
      } else if (g.hat === "sparse" && (s === 6 || s === 14)) {
        this.hat(t, 0.14);
      }
      if (g.kick.includes(s)) this.kick(t);
      if (g.snare.includes(s)) this.snare(t);
    }

    // --- sub bass on composed steps ---
    if (g.bass.includes(s)) {
      const region = clamp(Math.floor(this.scan * 4), 0, 3);
      this.bassNote(26 + f.regionRoots[region], t, 0.5);
    }

    // --- melody on eighth notes, driven by the pixels under the beam ---
    if (s % 2 === 0) {
      const targetCol = clamp(Math.floor(this.scan * (COLS - 1)), 0, COLS - 1);
      let best: ColumnFeat | null = null;
      const from = Math.min(this.lastMelCol, targetCol);
      for (let x = from; x <= targetCol; x++) {
        const c = f.columns[x];
        if (!best || c.energy > best.energy) best = c;
      }
      this.lastMelCol = targetCol + 1;

      if (best && best.l > 0.05) {
        const scale = f.mode === "minor" ? MINOR_PENT_EXT : MAJOR_PENT_EXT;
        const idx = Math.min(scale.length - 1, Math.floor(Math.pow(best.l, 1.18) * scale.length));
        const midi = 60 + f.rootPc + scale[idx];
        const vel = clamp(0.13 + best.energy * 0.52 + (best.s > 0.55 ? 0.07 : 0), 0.1, 0.72);
        this.pluck(midi, vel, t, 0.9 + best.l * 0.9);
        this.currentMelody = noteName(midi);
        this.currentMelodyUntil = t + 0.6;
        // data-shimmer: saturated pixels occasionally answer one octave up
        if (Math.random() < best.s * 0.28) {
          this.pluck(midi + 12, vel * 0.42, t + stepDur / 2, 0.7);
        }
      } else {
        this.currentMelody = null;
      }
    }
  }

  /* ---------------- voices ---------------- */

  private chordMidi(region: number): number[] {
    const f = this.features!;
    const rootPc = f.regionRoots[region];
    const third = f.mode === "minor" ? 3 : 4;
    const base = 45 + rootPc; // around A2–G♯3
    return [base, base + third, base + 7, base + 12];
  }

  private chordLabel(region: number): string {
    const f = this.features!;
    return `${pcName(f.regionRoots[region])}${f.mode === "minor" ? "m" : ""}`;
  }

  private firePad(region: number) {
    const ctx = this.ctx!;
    const f = this.features!;
    const t = ctx.currentTime;

    // release previous chord slowly
    this.fadePads(1.1);

    const chord = this.chordMidi(region);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.setTargetAtTime(0.42, t, 1.15);

    // warmth maps the filter: hotter imagery → brighter timbre
    const warmN = clamp01((f.warmth + 1) / 2);
    const cutoff = 300 + warmN * 1550 + f.saturation * 420;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 0.8;

    const oscs: OscillatorNode[] = [];
    chord.forEach((midi, i) => {
      const freq = midiToFreq(midi);
      // two detuned saws + a triangle sub for body
      const detunePair: OscillatorType[] = i < 2 ? ["sawtooth", "sawtooth"] : ["triangle", "triangle"];
      detunePair.forEach((type, j) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.detune.value = j === 0 ? -7 : 7;
        const og = ctx.createGain();
        og.gain.value = type === "triangle" ? 0.5 : 0.34;
        o.connect(og);
        og.connect(filter);
        oscs.push(o);
      });
    });

    filter.connect(gain);
    gain.connect(this.master!);
    gain.connect(this.convolver!);

    oscs.forEach((o) => o.start(t));
    this.padVoices.push({ gain, oscs });

    // cap the stack
    if (this.padVoices.length > 4) this.padVoices.shift();
  }

  private fadePads(release: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    for (const v of this.padVoices) {
      const g = v.gain.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.0001, t, release);
      for (const o of v.oscs) {
        try {
          o.stop(t + release * 5 + 1);
        } catch {
          /* already stopped */
        }
      }
    }
    this.padVoices = [];
  }

  private pluck(midi: number, vel: number, when: number, octaveDecay = 1.2) {
    const ctx = this.ctx!;
    const t = when;
    const freq = midiToFreq(midi);

    const o1 = ctx.createOscillator();
    o1.type = "triangle";
    o1.frequency.value = freq;
    o1.detune.value = (Math.random() - 0.5) * 6;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.22;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1500 + vel * 2600, t);
    lp.frequency.exponentialRampToValueAtTime(700 + vel * 700, t + 1.4);
    lp.Q.value = 0.8;

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.0001, t);
    vca.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    vca.gain.exponentialRampToValueAtTime(0.0001, t + 0.55 + octaveDecay * 1.9);

    o1.connect(lp);
    o2.connect(o2g);
    o2g.connect(lp);
    lp.connect(vca);
    vca.connect(this.master!);
    vca.connect(this.delay!);
    vca.connect(this.convolver!);

    o1.start(t);
    o2.start(t);
    const end = t + 0.7 + octaveDecay * 2.1;
    o1.stop(end);
    o2.stop(end);
  }

  private bassNote(midi: number, when: number, level: number) {
    const ctx = this.ctx!;
    const t = when;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midiToFreq(midi);
    const o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = midiToFreq(midi);
    const o2g = ctx.createGain();
    o2g.gain.value = 0.3;

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.0001, t);
    vca.gain.exponentialRampToValueAtTime(level, t + 0.03);
    vca.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);

    o.connect(vca);
    o2.connect(o2g);
    o2g.connect(vca);
    vca.connect(this.master!);
    vca.connect(this.convolver!);
    o.start(t);
    o2.start(t);
    o.stop(t + 2.1);
    o2.stop(t + 2.1);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(41, t + 0.11);
    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.9, t);
    vca.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(vca);
    vca.connect(this.master!);
    o.start(t);
    o.stop(t + 0.3);
    // transient click
    this.noiseHit(t, 0.06, 2500, "highpass", 0.12);
  }

  private snare(t: number) {
    this.noiseHit(t, 0.16, 1900, "bandpass", 0.42);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 186;
    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.3, t);
    vca.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(vca);
    vca.connect(this.master!);
    o.start(t);
    o.stop(t + 0.14);
  }

  private hat(t: number, level: number) {
    this.noiseHit(t, 0.035, 7900, "highpass", level);
  }

  private noiseHit(t: number, dur: number, freq: number, type: BiquadFilterType, level: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = type === "bandpass" ? 1.1 : 0.7;
    const vca = ctx.createGain();
    vca.gain.setValueAtTime(level, t);
    vca.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(vca);
    vca.connect(this.master!);
    if (type !== "highpass") vca.connect(this.convolver!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Audition any single pixel — used by the "poke the image" probe. */
  pluckPixel(c: ColumnFeat) {
    this.ensureGraph();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") void ctx.resume();
    const f = this.features;
    if (!f) return;
    const scale = f.mode === "minor" ? MINOR_PENT_EXT : MAJOR_PENT_EXT;
    const idx = Math.min(scale.length - 1, Math.floor(Math.pow(c.l, 1.18) * scale.length));
    const midi = 60 + f.rootPc + scale[idx];
    const vel = clamp(0.18 + c.energy * 0.5, 0.12, 0.7);
    this.pluck(midi, vel, ctx.currentTime + 0.01, 1.6);
  }
}

export const jukeboxEngine = new Engine();
