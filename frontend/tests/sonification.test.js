import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SONIFICATION_MAPPING,
  anomalyToFrequency,
  createSonificationEngine,
  describeSonification,
  getSonificationTone,
} from '../src/services/sonificationService.js'

class FakeAudioParam {
  constructor(value = 0) {
    this.value = value
    this.events = []
  }

  record(type, value, time) {
    this.events.push({ type, value, time })

    if (typeof value === 'number') {
      this.value = value
    }

    return this
  }

  setValueAtTime(value, time) {
    return this.record('set', value, time)
  }

  linearRampToValueAtTime(value, time) {
    return this.record('linear', value, time)
  }

  exponentialRampToValueAtTime(value, time) {
    return this.record('exponential', value, time)
  }

  setTargetAtTime(value, time, constant) {
    this.events.push({ type: 'target', value, time, constant })
    this.value = value
    return this
  }

  cancelScheduledValues(time) {
    return this.record('cancel', undefined, time)
  }

  cancelAndHoldAtTime(time) {
    return this.record('hold', undefined, time)
  }
}

class FakeAudioNode {
  connect(target) {
    this.connectedTo = target
    return target
  }

  disconnect() {
    this.disconnected = true
  }
}

class FakeOscillator extends FakeAudioNode {
  constructor() {
    super()
    this.frequency = new FakeAudioParam(440)
    this.type = 'sine'
    this.started = false
    this.stopped = false
    this.onended = null
  }

  start(time) {
    this.started = true
    this.startTime = time
  }

  stop(time) {
    this.stopped = true
    this.stopTime = time
  }
}

class FakeGain extends FakeAudioNode {
  constructor() {
    super()
    this.gain = new FakeAudioParam(1)
  }
}

class FakeCompressor extends FakeAudioNode {
  constructor() {
    super()
    this.threshold = new FakeAudioParam(0)
    this.knee = new FakeAudioParam(0)
    this.ratio = new FakeAudioParam(0)
    this.attack = new FakeAudioParam(0)
    this.release = new FakeAudioParam(0)
  }
}

class FakeAnalyser extends FakeAudioNode {
  constructor() {
    super()
    this.fftSize = 2048
    this.signal = 0.25
  }

  getByteTimeDomainData(buffer) {
    buffer.fill(128 + this.signal * 127)
  }
}

class FakeAudioContext {
  constructor() {
    this.state = 'suspended'
    this.currentTime = 0
    this.destination = new FakeAudioNode()
    this.oscillators = []
    this.gains = []
  }

  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }

  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }

  createDynamicsCompressor() {
    return new FakeCompressor()
  }

  createAnalyser() {
    return new FakeAnalyser()
  }

  async resume() {
    this.state = 'running'
  }

  async suspend() {
    this.state = 'suspended'
  }

  async close() {
    this.state = 'closed'
    this.closed = true
  }
}

function createHarness() {
  const contexts = []
  const engine = createSonificationEngine({
    audioContextFactory: () => {
      const context = new FakeAudioContext()
      contexts.push(context)
      return context
    },
  })

  return { engine, contexts }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

test('pitch mapping is fixed and reaches the documented endpoints', () => {
  assert.equal(Math.round(anomalyToFrequency(-2)), 220)
  assert.equal(Math.round(anomalyToFrequency(0)), 440)
  assert.equal(Math.round(anomalyToFrequency(2)), 880)
  assert.equal(anomalyToFrequency(null), null)
  assert.equal(anomalyToFrequency('***'), null)
})

test('higher anomalies always produce higher pitches', () => {
  const anomalies = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]
  const frequencies = anomalies.map(anomalyToFrequency)

  for (let index = 1; index < frequencies.length; index += 1) {
    assert.ok(
      frequencies[index] > frequencies[index - 1],
      `${anomalies[index]} °C should sound higher than ${anomalies[index - 1]} °C`,
    )
  }
})

test('values outside the fixed domain clamp while the value stays exact', () => {
  const cold = getSonificationTone({ year: 1900, month: 1, anomaly: -12.5 })
  const hot = getSonificationTone({ year: 2100, month: 1, anomaly: 12.5 })

  assert.equal(Math.round(cold.frequencyHz), SONIFICATION_MAPPING.minFrequencyHz)
  assert.equal(Math.round(hot.frequencyHz), SONIFICATION_MAPPING.maxFrequencyHz)
  assert.equal(cold.clamped, true)
  assert.equal(hot.clamped, true)
  assert.equal(cold.record.anomaly, -12.5)
  assert.equal(hot.record.anomaly, 12.5)
})

test('missing values map to silence, not zero', () => {
  const tone = getSonificationTone({ year: 2026, month: 10, anomaly: null })
  const description = describeSonification({ year: 2026, month: 10, anomaly: null })

  assert.equal(tone.isSilent, true)
  assert.equal(tone.frequencyHz, null)
  assert.match(description, /silence/i)
  assert.match(description, /never treated as zero/i)
  assert.doesNotMatch(description, /hertz/i)
})

test('play starts one reusable voice and reports the mapped pitch', async () => {
  const { engine, contexts } = createHarness()
  const state = await engine.play({ year: 2020, month: 1, anomaly: 0 })

  assert.equal(state.isPlaying, true)
  assert.equal(state.contextState, 'running')
  assert.equal(Math.round(state.frequencyHz), 440)
  assert.equal(state.noteCount, 1)
  assert.equal(state.activeVoiceCount, 1)
  assert.ok(state.outputLevel > 0)
  assert.equal(contexts.length, 1)
  assert.equal(contexts[0].oscillators.length, 1)

  await engine.stop()
})

test('repeated play calls never create overlapping oscillators', async () => {
  const { engine, contexts } = createHarness()
  const record = { year: 2020, month: 1, anomaly: 0 }

  await engine.play(record)
  await engine.play(record)
  await engine.play(record)

  const state = engine.getState()
  assert.equal(contexts.length, 1)
  assert.equal(contexts[0].oscillators.length, 1)
  assert.equal(state.activeVoiceCount, 1)
  assert.ok(state.noteCount >= 1)

  await engine.stop()
})

test('pause suspends and play resumes the same session', async () => {
  const { engine, contexts } = createHarness()

  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  await engine.pause()

  assert.equal(engine.getState().isPlaying, false)
  await wait(170)
  assert.equal(contexts[0].state, 'suspended')

  const resumed = await engine.play()
  assert.equal(resumed.isPlaying, true)
  assert.equal(resumed.contextState, 'running')
  assert.equal(contexts.length, 1)

  await engine.stop()
})

test('updateData changes pitch without restarting the session', async () => {
  const { engine, contexts } = createHarness()

  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  const cold = engine.updateData({ year: 2020, month: 2, anomaly: -1 })
  const warm = engine.updateData({ year: 2020, month: 3, anomaly: 1 })

  assert.ok(warm.frequencyHz > cold.frequencyHz)
  assert.equal(contexts[0].oscillators.length, 1)
  assert.equal(warm.activeVoiceCount, 1)

  await engine.stop()
})

test('missing updateData produces silence without a new pitch', async () => {
  const { engine, contexts } = createHarness()

  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  const before = engine.getState().noteCount
  const state = engine.updateData({ year: 2020, month: 2, anomaly: null })

  assert.equal(state.isSilent, true)
  assert.equal(state.frequencyHz, null)
  assert.equal(state.noteCount, before)
  assert.equal(contexts[0].oscillators.length, 1)

  await engine.stop()
})

test('year boundaries ring one soft bell', async () => {
  const { engine, contexts } = createHarness()

  await engine.play({ year: 2020, month: 12, anomaly: 0 })
  const sameYear = engine.updateData({ year: 2020, month: 11, anomaly: 0.1 })
  assert.equal(sameYear.activeBellCount, 0)

  const nextYear = engine.updateData({ year: 2021, month: 1, anomaly: 0.2 })
  assert.equal(nextYear.activeBellCount, 1)
  assert.equal(contexts[0].oscillators.length, 2)

  await engine.stop()
})

test('stop closes resources and replay starts a fresh session', async () => {
  const { engine, contexts } = createHarness()

  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  await engine.stop()

  const stopped = engine.getState()
  assert.equal(stopped.isPlaying, false)
  assert.equal(stopped.contextState, 'closed')
  assert.equal(contexts[0].state, 'closed')

  const replayed = await engine.replay({ year: 2020, month: 1, anomaly: 0 })
  assert.equal(replayed.isPlaying, true)
  assert.equal(replayed.contextState, 'running')
  assert.equal(contexts.length, 2)
  assert.equal(contexts[1].oscillators.length, 1)

  await engine.stop()
})

test('stop is idempotent and safe to call concurrently', async () => {
  const { engine, contexts } = createHarness()

  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  await Promise.all([engine.stop(), engine.stop(), engine.stop()])

  assert.equal(engine.getState().contextState, 'closed')
  assert.equal(contexts[0].state, 'closed')
})

test('volume and playback speed are clamped and published', async () => {
  const { engine, contexts } = createHarness()

  engine.setVolume(-4)
  assert.equal(engine.getState().volume, 0)

  engine.setVolume(4)
  assert.equal(engine.getState().volume, 1)

  engine.setVolume(0.35)
  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  assert.equal(engine.getState().volume, 0.35)
  assert.equal(contexts[0].gains[0].gain.value, 0.35)

  engine.setPlaybackSpeed(2)
  assert.equal(engine.getState().playbackSpeed, 2)
  assert.equal(engine.getState().tempoMs, 310)

  engine.setPlaybackSpeed(100)
  assert.equal(engine.getState().playbackSpeed, SONIFICATION_MAPPING.maxPlaybackSpeed)

  engine.setPlaybackSpeed(0.01)
  assert.equal(engine.getState().playbackSpeed, SONIFICATION_MAPPING.minPlaybackSpeed)

  await engine.stop()
})

test('updates while paused do not schedule sound', async () => {
  const { engine } = createHarness()

  await engine.play({ year: 2020, month: 1, anomaly: 0 })
  await engine.pause()
  const before = engine.getState().noteCount

  engine.updateData({ year: 2020, month: 2, anomaly: 1.2 })
  assert.equal(engine.getState().noteCount, before)

  await engine.stop()
})
