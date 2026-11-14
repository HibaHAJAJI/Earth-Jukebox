/**
 * SONIFICATION SERVICE
 *
 * Converts monthly NASA GISS GISTEMP v4 temperature anomalies into sound with
 * the Web Audio API. The engine is intentionally independent of React: the UI
 * registers/subscribes to it and pushes the selected record to it.
 *
 * ---------------------------------------------------------------------------
 * DOCUMENTED TEMPERATURE-TO-SOUND MAPPING
 * ---------------------------------------------------------------------------
 *
 * Pitch (temperature anomaly):
 *   - The pitch domain is FIXED for every year of the dataset:
 *       -2.0 °C  ->  220 Hz  (A3, low)
 *        0.0 °C  ->  440 Hz  (A4, the 1951-1980 baseline)
 *       +2.0 °C  ->  880 Hz  (A5, high)
 *   - The mapping is logarithmic in frequency so equal temperature steps sound
 *     like equal musical intervals (equal ratios, not equal Hz increments):
 *
 *       normalized = (anomaly - (-2.0)) / (2.0 - (-2.0))
 *       frequency  = 220 * (880 / 220) ^ normalized
 *
 *   - Values outside the fixed domain are clamped to the nearest pitch. The
 *     displayed anomaly is never changed, and no missing value is replaced.
 *
 * Rhythm (time):
 *   - Every selected month produces one short note. The app timeline controls
 *     the rhythm; the engine never advances its own independent cursor.
 *   - Tempo follows the shared playback-speed control. At 1x a month lasts
 *     620 ms, matching the visual timeline.
 *
 * Year boundary:
 *   - When playback crosses into a later year, a soft bell accent sounds.
 *
 * Missing data:
 *   - A null / absent anomaly produces silence. Missing data is never mapped
 *     to 0 °C or to any invented pitch.
 *
 * Smoothness:
 *   - Pitch changes glide instead of jumping, and every note has a short
 *     attack/release envelope. Playback stops with a short fade before the
 *     AudioContext is closed, so controls never produce abrupt clicks.
 *
 * ---------------------------------------------------------------------------
 * ENGINE CONTRACT
 * ---------------------------------------------------------------------------
 *
 *   isConnected: true
 *
 *   play(record)        Start/resume. record is { year, month, anomaly } | null.
 *   pause()             Fade out and suspend the audio context.
 *   stop()              Fade out, stop voices, close the context, reset transport.
 *   replay(record)      Restart a single-note session from the given record.
 *   setVolume(value)    value = 0..1, applied smoothly.
 *   setPlaybackSpeed(n) n = 0.25..8, changes the note envelope/tempo metadata.
 *   updateData(record)  Called whenever the selected month changes. It updates
 *                       the mapped note without restarting the session.
 *   prepare()           Create/resume the AudioContext from a user gesture.
 *   getState()          Diagnostics for tests and accessible status text.
 *
 * play/pause/stop/updateData are idempotent and safe for React effects to call
 * more than once. A single monophonic oscillator is reused, so repeated user
 * interactions never create overlapping audio sessions.
 */

import { formatAnomaly, parseAnomaly } from './temperatureService.js'
import { formatMonthYear } from '../utils/format.js'

export const SONIFICATION_MAPPING = Object.freeze({
  minAnomalyC: -2,
  maxAnomalyC: 2,
  minFrequencyHz: 220,
  maxFrequencyHz: 880,
  baselineFrequencyHz: 440,
  baseStepMs: 620,
  minPlaybackSpeed: 0.25,
  maxPlaybackSpeed: 8,
  defaultVolume: 0.7,
  minNoteSeconds: 0.055,
  maxNoteSeconds: 0.42,
  notePeakGain: 0.5,
  bellPeakGain: 0.11,
  bellSeconds: 0.55,
})

const pad = (value) => Math.min(Math.max(value, 0), 1)

function normalizeAudioRecord(record) {
  if (!record) {
    return null
  }

  const year = Number(record.year)
  const month = Number(record.month)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return {
    year,
    month,
    anomaly: parseAnomaly(record.anomaly),
  }
}

/**
 * Deterministic anomaly-to-frequency mapping. Returns null for missing data.
 * The fixed domain makes every year directly comparable.
 */
export function anomalyToFrequency(anomaly) {
  const value = parseAnomaly(anomaly)

  if (value === null) {
    return null
  }

  const { minAnomalyC, maxAnomalyC, minFrequencyHz, maxFrequencyHz } = SONIFICATION_MAPPING
  const normalized = pad((value - minAnomalyC) / (maxAnomalyC - minAnomalyC))
  const ratio = maxFrequencyHz / minFrequencyHz

  return minFrequencyHz * ratio ** normalized
}

/**
 * Structured description of one record for the UI, accessible text and tests.
 */
export function getSonificationTone(record) {
  const normalizedRecord = normalizeAudioRecord(record)

  if (!normalizedRecord || normalizedRecord.anomaly === null) {
    return {
      isSilent: true,
      frequencyHz: null,
      normalized: null,
      pitchLabel: 'Silence',
      clamped: false,
      record: normalizedRecord,
    }
  }

  const { minAnomalyC, maxAnomalyC } = SONIFICATION_MAPPING
  const frequencyHz = anomalyToFrequency(normalizedRecord.anomaly)
  const normalized = pad((normalizedRecord.anomaly - minAnomalyC) / (maxAnomalyC - minAnomalyC))
  const pitchLabel =
    frequencyHz < 330 ? 'Low pitch' : frequencyHz < 660 ? 'Mid pitch' : 'High pitch'

  return {
    isSilent: false,
    frequencyHz,
    normalized,
    pitchLabel,
    clamped: normalizedRecord.anomaly < minAnomalyC || normalizedRecord.anomaly > maxAnomalyC,
    record: normalizedRecord,
  }
}

/**
 * Plain-language explanation of the sound for the selected month. Used both in
 * the visible panel and in the polite screen-reader live region.
 */
export function describeSonification(record, unit = '°C') {
  const normalizedRecord = normalizeAudioRecord(record)

  if (!normalizedRecord) {
    return 'No month is selected, so no pitch is mapped.'
  }

  const tone = getSonificationTone(normalizedRecord)

  if (tone.isSilent) {
    return `${formatMonthYear(normalizedRecord)} has no reported anomaly. The sonification plays silence for this month; missing data is never treated as zero.`
  }

  const { minAnomalyC, maxAnomalyC } = SONIFICATION_MAPPING
  const rangeNote = tone.clamped
    ? ` The anomaly is outside the fixed ${minAnomalyC} to +${maxAnomalyC} °C pitch range, so the pitch is held at the nearest end while the displayed value stays exact.`
    : ''

  return `${formatMonthYear(normalizedRecord)}: ${formatAnomaly(
    normalizedRecord.anomaly,
    unit,
  )}, mapped to a ${tone.pitchLabel.toLowerCase()} of about ${Math.round(
    tone.frequencyHz,
  )} hertz.${rangeNote}`
}

function defaultAudioContextFactory() {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext

  if (!AudioContextConstructor) {
    return null
  }

  return new AudioContextConstructor()
}

function holdAudioParam(param, time) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(time)
    return
  }

  // Safari/older engines: preserve the current value before cancelling.
  const currentValue = param.value
  param.cancelScheduledValues(time)
  param.setValueAtTime(currentValue, time)
}

function wait(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))
}

export function createSonificationEngine(options = {}) {
  const audioContextFactory = options.audioContextFactory ?? defaultAudioContextFactory
  const timers = options.timers ?? {
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  }

  let context = null
  let masterGain = null
  let compressor = null
  let analyser = null
  let analyserData = null
  let voice = null
  let bells = new Set()
  let suspendTimer = null
  let stopPromise = null
  let isPlaying = false
  let volume = SONIFICATION_MAPPING.defaultVolume
  let playbackSpeed = 1
  let currentRecord = null
  let previousRecord = null
  let frequencyHz = null
  let isSilent = true
  let noteCount = 0
  let pageHideHandler = null

  function clearSuspendTimer() {
    if (suspendTimer !== null) {
      timers.clearTimeout(suspendTimer)
      suspendTimer = null
    }
  }

  function scheduleSuspend() {
    clearSuspendTimer()

    suspendTimer = timers.setTimeout(() => {
      suspendTimer = null

      if (!isPlaying && context && context.state === 'running') {
        Promise.resolve(context.suspend()).catch(() => {})
      }
    }, 120)
  }

  function ensureGraph() {
    if (context && context.state !== 'closed') {
      return context
    }

    const nextContext = audioContextFactory()

    if (!nextContext) {
      throw new Error(
        'This browser does not support the Web Audio API, so sonification cannot play.',
      )
    }

    if (typeof nextContext.createGain !== 'function' || typeof nextContext.createOscillator !== 'function') {
      throw new Error('The Web Audio API is incomplete in this browser and cannot synthesize sound.')
    }

    context = nextContext
    masterGain = context.createGain()
    masterGain.gain.setValueAtTime(volume, context.currentTime)

    compressor =
      typeof context.createDynamicsCompressor === 'function'
        ? context.createDynamicsCompressor()
        : null
    analyser = typeof context.createAnalyser === 'function' ? context.createAnalyser() : null

    if (compressor) {
      compressor.threshold.value = -18
      compressor.knee.value = 24
      compressor.ratio.value = 6
      compressor.attack.value = 0.01
      compressor.release.value = 0.25
    }

    if (analyser) {
      analyser.fftSize = 1024
      analyserData = new Uint8Array(analyser.fftSize)
    }

    let tail = masterGain

    if (compressor) {
      tail.connect(compressor)
      tail = compressor
    }

    if (analyser) {
      tail.connect(analyser)
      tail = analyser
    }

    tail.connect(context.destination)
    return context
  }

  async function resumeGraph() {
    if (!context) {
      return
    }

    if (context.state !== 'running') {
      await context.resume()
    }

    if (context.state !== 'running') {
      throw new Error(
        'The browser blocked audio playback. Press Play again so the sound can start from a user action.',
      )
    }
  }

  function ensureVoice() {
    if (voice) {
      return voice
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(SONIFICATION_MAPPING.baselineFrequencyHz, context.currentTime)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start()

    voice = { oscillator, gain }
    return voice
  }

  function silenceVoice(releaseSeconds = 0.06) {
    if (!context || !voice) {
      return
    }

    const now = context.currentTime
    holdAudioParam(voice.gain.gain, now)
    voice.gain.gain.linearRampToValueAtTime(0.0001, now + releaseSeconds)
  }

  function silenceBells(releaseSeconds = 0.06) {
    if (!context) {
      return
    }

    const now = context.currentTime

    for (const bell of bells) {
      holdAudioParam(bell.gain.gain, now)
      bell.gain.gain.linearRampToValueAtTime(0.0001, now + releaseSeconds)
    }
  }

  function ringYearBell(frequency, startTime) {
    if (!context || !masterGain) {
      return
    }

    const { bellPeakGain, bellSeconds } = SONIFICATION_MAPPING
    const bellFrequency = Math.min(Math.max(frequency * 2, 330), 2000)
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(bellFrequency, startTime)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(bellPeakGain, startTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + bellSeconds)

    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start(startTime)
    oscillator.stop(startTime + bellSeconds + 0.05)

    const bell = { oscillator, gain }
    bells.add(bell)

    oscillator.onended = () => {
      bells.delete(bell)

      try {
        oscillator.disconnect()
        gain.disconnect()
      } catch {
        // Nodes may already be disconnected when the context closes.
      }
    }
  }

  function playNote(record) {
    if (!context || !isPlaying) {
      return
    }

    const normalizedRecord = normalizeAudioRecord(record)
    const priorRecord = currentRecord
    const anomaly = normalizedRecord?.anomaly ?? null
    const now = context.currentTime + 0.005

    previousRecord = priorRecord
    currentRecord = normalizedRecord

    if (anomaly === null) {
      frequencyHz = null
      isSilent = true
      silenceVoice(0.06)
      silenceBells(0.06)
      return
    }

    const targetFrequency = anomalyToFrequency(anomaly)
    const { minNoteSeconds, maxNoteSeconds, notePeakGain } = SONIFICATION_MAPPING
    const stepSeconds = SONIFICATION_MAPPING.baseStepMs / playbackSpeed / 1000
    const noteSeconds = Math.min(
      maxNoteSeconds,
      Math.max(minNoteSeconds, stepSeconds * 0.58),
    )
    const attackSeconds = Math.min(0.03, noteSeconds * 0.3)
    const releaseSeconds = Math.min(0.16, noteSeconds * 0.6)
    const sustainEnd = now + Math.max(attackSeconds, noteSeconds - releaseSeconds)
    const { oscillator, gain } = ensureVoice()
    const previousFrequency = frequencyHz

    isSilent = false
    frequencyHz = targetFrequency
    noteCount += 1

    if (previousFrequency === null) {
      oscillator.frequency.cancelScheduledValues(now)
      oscillator.frequency.setValueAtTime(targetFrequency, now)
    } else {
      holdAudioParam(oscillator.frequency, now)
      const glideSeconds = Math.min(0.09, Math.max(0.02, noteSeconds * 0.35))
      oscillator.frequency.exponentialRampToValueAtTime(
        targetFrequency,
        now + glideSeconds,
      )
    }

    holdAudioParam(gain.gain, now)
    gain.gain.linearRampToValueAtTime(notePeakGain, now + attackSeconds)
    gain.gain.setValueAtTime(notePeakGain, sustainEnd)
    gain.gain.linearRampToValueAtTime(0.0001, now + noteSeconds)

    const crossedYearBoundary =
      normalizedRecord &&
      priorRecord &&
      normalizedRecord.year > priorRecord.year

    if (crossedYearBoundary) {
      ringYearBell(targetFrequency, now + 0.01)
    }
  }

  async function prepare() {
    if (stopPromise) {
      await stopPromise
    }

    clearSuspendTimer()
    ensureGraph()
    await resumeGraph()
    return true
  }

  async function play(record = undefined) {
    await prepare()
    isPlaying = true

    if (record !== undefined) {
      const normalizedRecord = normalizeAudioRecord(record)
      currentRecord = normalizedRecord
    }

    if (currentRecord) {
      playNote(currentRecord)
    } else {
      frequencyHz = null
      isSilent = true
      silenceVoice(0.04)
    }

    return getState()
  }

  async function pause() {
    isPlaying = false

    if (context && context.state !== 'closed') {
      silenceVoice(0.08)
      silenceBells(0.08)
      scheduleSuspend()
    }

    return getState()
  }

  async function stop() {
    if (stopPromise) {
      return stopPromise
    }

    isPlaying = false
    currentRecord = null
    previousRecord = null
    frequencyHz = null
    isSilent = true
    clearSuspendTimer()

    stopPromise = (async () => {
      const activeContext = context

      if (!activeContext) {
        return
      }

      if (activeContext.state !== 'closed') {
        silenceVoice(0.04)
        silenceBells(0.04)
        await wait(60)

        try {
          if (activeContext.state !== 'closed') {
            await activeContext.close()
          }
        } catch {
          // Closing can fail if the browser already tore the context down.
        }
      }

      if (context === activeContext) {
        context = null
        masterGain = null
        compressor = null
        analyser = null
        analyserData = null
        voice = null
        bells = new Set()
      }
    })()

    try {
      await stopPromise
    } finally {
      stopPromise = null
    }
  }

  function updateData(record) {
    const normalizedRecord = normalizeAudioRecord(record)

    if (!isPlaying || !context) {
      currentRecord = normalizedRecord
      previousRecord = null
      return getState()
    }

    playNote(normalizedRecord)
    return getState()
  }

  function setVolume(value) {
    const nextVolume = Number(value)

    if (!Number.isFinite(nextVolume)) {
      return getState()
    }

    volume = pad(nextVolume)

    if (context && masterGain) {
      const now = context.currentTime
      masterGain.gain.cancelScheduledValues(now)
      masterGain.gain.setTargetAtTime(volume, now, 0.02)
    }

    return getState()
  }

  function setPlaybackSpeed(value) {
    const nextSpeed = Number(value)

    if (!Number.isFinite(nextSpeed) || nextSpeed <= 0) {
      return getState()
    }

    playbackSpeed = Math.min(
      Math.max(nextSpeed, SONIFICATION_MAPPING.minPlaybackSpeed),
      SONIFICATION_MAPPING.maxPlaybackSpeed,
    )

    return getState()
  }

  function getOutputLevel() {
    if (!analyser || !analyserData || !context || context.state !== 'running') {
      return 0
    }

    analyser.getByteTimeDomainData(analyserData)
    let sum = 0

    for (const sample of analyserData) {
      const centered = (sample - 128) / 128
      sum += centered * centered
    }

    return Math.sqrt(sum / analyserData.length)
  }

  function getState() {
    const tempoMs = Math.round(SONIFICATION_MAPPING.baseStepMs / playbackSpeed)

    return {
      isConnected: true,
      isPlaying,
      contextState: context?.state ?? 'closed',
      volume,
      playbackSpeed,
      tempoMs,
      currentRecord: currentRecord ? { ...currentRecord } : null,
      previousRecord: previousRecord ? { ...previousRecord } : null,
      frequencyHz,
      isSilent,
      noteCount,
      activeVoiceCount: voice ? 1 : 0,
      activeBellCount: bells.size,
      outputLevel: getOutputLevel(),
    }
  }

  async function replay(record) {
    await stop()
    return play(record)
  }

  async function dispose() {
    if (pageHideHandler && typeof window !== 'undefined') {
      window.removeEventListener('pagehide', pageHideHandler)
      pageHideHandler = null
    }

    await stop()
  }

  const engine = {
    isConnected: true,
    play,
    pause,
    stop,
    replay,
    prepare,
    updateData,
    setVolume,
    setPlaybackSpeed,
    getState,
    dispose,
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    pageHideHandler = () => {
      stop().catch(() => {})
    }
    window.addEventListener('pagehide', pageHideHandler)
  }

  return engine
}

const notConnectedError = () =>
  Promise.reject(new Error('Sonification engine is not connected yet.'))

const placeholderEngine = {
  isConnected: false,
  play: notConnectedError,
  pause: notConnectedError,
  stop: notConnectedError,
  setVolume: () => {},
  updateData: () => {},
}

let activeEngine = placeholderEngine
const listeners = new Set()

function notifyListeners() {
  for (const listener of listeners) {
    listener(activeEngine)
  }
}

export function registerSonificationEngine(engine) {
  const nextEngine = engine ?? placeholderEngine

  if (
    activeEngine !== placeholderEngine &&
    activeEngine !== nextEngine &&
    typeof activeEngine?.stop === 'function'
  ) {
    try {
      Promise.resolve(activeEngine.stop()).catch(() => {})
    } catch {
      // Replacing an engine must never prevent the new one from registering.
    }
  }

  activeEngine = nextEngine
  notifyListeners()
}

export function getSonificationEngine() {
  return activeEngine
}

export function isSonificationConnected() {
  return activeEngine.isConnected === true
}

export function subscribeToSonificationEngine(listener) {
  listeners.add(listener)
  listener(activeEngine)

  return () => {
    listeners.delete(listener)
  }
}

/**
 * The production engine is created once and registered immediately. Audio is
 * still silent until play() is called from a user action; constructing the
 * engine does not create an AudioContext or start playback.
 */
export const sonificationEngine = createSonificationEngine()
registerSonificationEngine(sonificationEngine)
