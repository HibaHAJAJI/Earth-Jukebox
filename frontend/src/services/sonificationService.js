/**
 * SONIFICATION INTEGRATION POINT
 *
 * The audio team should implement this contract and register their engine:
 *
 *   import { registerSonificationEngine } from '../services/sonificationService'
 *
 *   registerSonificationEngine({
 *     isConnected: true,
 *     play(record),          // record = { year, month, anomaly } | null
 *     pause(),
 *     stop(),
 *     setVolume(value),      // value = 0..1
 *     updateData(record),    // called whenever the selected month changes
 *   })
 *
 * Until then, the placeholder reports "not connected" and never produces
 * audio. This prevents the UI from claiming that sonification is running.
 *
 * The engine may be registered before or after React mounts. Registered
 * listeners are notified immediately, so the UI updates without a reload.
 */

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
  activeEngine = engine ?? placeholderEngine
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
