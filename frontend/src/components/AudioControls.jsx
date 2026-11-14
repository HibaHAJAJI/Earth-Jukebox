import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Gauge,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Square,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import useSonificationEngine from '../hooks/useSonificationEngine'
import {
  describeSonification,
  getSonificationTone,
  SONIFICATION_MAPPING,
} from '../services/sonificationService'
import { formatAnomaly, isMissingAnomaly } from '../services/temperatureService'
import { formatMonthYear, getAnomalyTone } from '../utils/format'

const SPEED_OPTIONS = [0.5, 1, 2, 4]

export default function AudioControls({
  selectedRecord,
  metadata,
  isPlaying = false,
  playbackSpeed = 1,
  onPlay,
  onPause,
  onStop,
  onReplay,
  onSpeedChange,
}) {
  const { engine, isConnected } = useSonificationEngine()
  const [volume, setVolume] = useState(Math.round(SONIFICATION_MAPPING.defaultVolume * 100))
  const [playbackStatus, setPlaybackStatus] = useState('idle')
  const [error, setError] = useState(null)
  const selectedRecordRef = useRef(selectedRecord)
  const wasPlayingRef = useRef(false)
  const unit = metadata?.unit ?? '°C'
  const hasMissingReading = Boolean(selectedRecord) && isMissingAnomaly(selectedRecord.anomaly)
  const tone = getSonificationTone(selectedRecord)
  const soundDescription = describeSonification(selectedRecord, unit)
  const isPaused = !isPlaying && playbackStatus === 'paused'
  const frequencyLabel = tone.isSilent ? 'Silence' : `${Math.round(tone.frequencyHz)} Hz`

  useEffect(() => {
    selectedRecordRef.current = selectedRecord
  }, [selectedRecord])

  // The selected month is the single source of truth: every change is pushed
  // to the engine without restarting the shared timeline.
  useEffect(() => {
    engine.updateData(selectedRecord)
  }, [engine, selectedRecord])

  useEffect(() => {
    engine.setVolume(volume / 100)
  }, [engine, volume])

  useEffect(() => {
    engine.setPlaybackSpeed?.(playbackSpeed)
  }, [engine, playbackSpeed])

  // Keep audio transport synchronized with the shared timeline state.
  useEffect(() => {
    if (!isConnected) {
      wasPlayingRef.current = false
      return undefined
    }

    const request = { cancelled: false }

    async function syncPlayback() {
      try {
        if (isPlaying) {
          wasPlayingRef.current = true
          setError(null)
          setPlaybackStatus('starting')
          await engine.play(selectedRecordRef.current)

          if (!request.cancelled) {
            setPlaybackStatus('playing')
          }
        } else if (wasPlayingRef.current) {
          wasPlayingRef.current = false
          await engine.pause()

          if (!request.cancelled) {
            setPlaybackStatus('paused')
          }
        }
      } catch (playbackError) {
        if (!request.cancelled) {
          wasPlayingRef.current = false
          setPlaybackStatus('idle')
          setError(
            playbackError instanceof Error
              ? playbackError.message
              : 'Unable to sync audio playback.',
          )
        }
      }
    }

    syncPlayback()

    return () => {
      request.cancelled = true
    }
  }, [engine, isConnected, isPlaying])

  // Leaving the page/route must always release the audio context.
  useEffect(() => {
    return () => {
      engine.stop().catch(() => {})
    }
  }, [engine])

  // Escape is an immediate, discoverable panic stop while audio is running.
  useEffect(() => {
    if (!isPlaying) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      wasPlayingRef.current = false
      setPlaybackStatus('idle')
      engine.stop().catch(() => {})
      onStop?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [engine, isPlaying, onStop])

  async function prepareAudio() {
    try {
      await engine.prepare?.()
      return true
    } catch (prepareError) {
      setPlaybackStatus('idle')
      setError(
        prepareError instanceof Error ? prepareError.message : 'Unable to start audio.',
      )
      return false
    }
  }

  async function handlePlay() {
    if (!isConnected) {
      return
    }

    setError(null)

    if (!(await prepareAudio())) {
      return
    }

    if (onPlay) {
      onPlay()
      return
    }

    try {
      setPlaybackStatus('starting')
      await engine.play(selectedRecord)
      setPlaybackStatus('playing')
    } catch (playbackError) {
      setPlaybackStatus('idle')
      setError(
        playbackError instanceof Error ? playbackError.message : 'Unable to start audio.',
      )
    }
  }

  async function handlePause() {
    if (!isConnected) {
      return
    }

    setError(null)

    if (onPause) {
      onPause()
      return
    }

    try {
      await engine.pause()
      setPlaybackStatus('paused')
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : 'Unable to pause audio.')
    }
  }

  async function handleStop() {
    if (!isConnected) {
      return
    }

    setError(null)
    wasPlayingRef.current = false
    setPlaybackStatus('idle')

    try {
      await engine.stop()
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Unable to stop audio.')
    } finally {
      onStop?.()
    }
  }

  async function handleReplay() {
    if (!isConnected || !onReplay) {
      return
    }

    setError(null)

    if (!(await prepareAudio())) {
      return
    }

    setPlaybackStatus('starting')
    onReplay()
  }

  const statusText = !isConnected
    ? 'Not connected'
    : error
      ? 'Audio error'
      : isPlaying && playbackStatus === 'starting'
        ? 'Starting audio'
        : isPlaying
          ? 'Audio playing'
          : isPaused
            ? 'Audio paused'
            : 'Audio engine ready'

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const playLabel = isPaused ? 'Resume' : 'Play'

  return (
    <section className="panel audio-panel" aria-labelledby="audio-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Sonification</p>
          <h2 id="audio-heading">Hear the selected month</h2>
        </div>
        <span
          className={`audio-state${isConnected ? ' is-connected' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          {statusText}
        </span>
      </div>

      <div className={`audio-connection${isConnected ? ' is-connected' : ''}`}>
        <span className="audio-connection-icon" aria-hidden="true">
          <Radio size={22} />
        </span>
        <div>
          <strong>
            {isConnected ? 'Web Audio engine ready' : 'Sonification engine not connected'}
          </strong>
          <p>
            {isConnected
              ? 'Pitch, rhythm and year-bell accents are synthesized locally in your browser. Playback follows the shared timeline and starts only when you press Play.'
              : 'The audio layer is unavailable. No audio is generated or played.'}
          </p>
        </div>
      </div>

      <div className="audio-transport" role="group" aria-label="Audio playback controls">
        <button
          type="button"
          className="control-button control-button--primary"
          onClick={handlePlay}
          disabled={!isConnected || isPlaying}
          aria-label={
            isPaused
              ? 'Resume sonification from the paused month'
              : 'Play sonification from the selected month'
          }
        >
          <Play size={16} aria-hidden="true" />
          {playLabel}
        </button>
        <button
          type="button"
          className="control-button"
          onClick={handlePause}
          disabled={!isConnected || !isPlaying}
          aria-label="Pause sonification without changing the selected month"
        >
          <Pause size={16} aria-hidden="true" />
          Pause
        </button>
        <button
          type="button"
          className="control-button"
          onClick={handleStop}
          disabled={!isConnected}
          aria-label="Stop sonification immediately and reset the timeline"
        >
          <Square size={14} aria-hidden="true" />
          Stop
        </button>
        <button
          type="button"
          className="control-button"
          onClick={handleReplay}
          disabled={!isConnected || !onReplay}
          aria-label="Replay sonification from the first month in the dataset"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Replay
        </button>
      </div>

      <div className="audio-settings">
        <div className="volume-control">
          <label htmlFor="audio-volume">
            <span>Volume</span>
            <span className="volume-value">{volume}%</span>
          </label>
          <div className="volume-row">
            <VolumeX size={16} aria-hidden="true" />
            <input
              id="audio-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-valuetext={`${volume} percent`}
              aria-describedby="audio-volume-hint"
            />
            <VolumeIcon size={18} aria-hidden="true" />
          </div>
          <p className="field-hint" id="audio-volume-hint">
            Volume is applied smoothly while audio is playing.
          </p>
        </div>

        <div className="audio-speed-control">
          <label htmlFor="audio-speed">
            <Gauge size={13} aria-hidden="true" />
            Playback speed
          </label>
          <select
            id="audio-speed"
            value={playbackSpeed}
            onChange={(event) => onSpeedChange?.(Number(event.target.value))}
            disabled={!isConnected}
            aria-label="Audio and timeline playback speed"
            aria-describedby="audio-speed-hint"
          >
            {SPEED_OPTIONS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
            {!SPEED_OPTIONS.includes(playbackSpeed) && (
              <option value={playbackSpeed}>{playbackSpeed}×</option>
            )}
          </select>
          <p className="field-hint" id="audio-speed-hint">
            One month is one note. The shared timeline uses the same tempo.
          </p>
        </div>
      </div>

      <div className="audio-data-preview">
        <div>
          <span>Selected month</span>
          <strong>{formatMonthYear(selectedRecord)}</strong>
        </div>
        <span className={`audio-anomaly tone-${getAnomalyTone(selectedRecord?.anomaly)}`}>
          {formatAnomaly(selectedRecord?.anomaly, unit)}
        </span>
      </div>

      <div className="audio-current-sound" role="group" aria-labelledby="audio-current-heading">
        <div className="audio-current-header">
          <span id="audio-current-heading">Current sound</span>
          <strong className={tone.isSilent ? 'audio-silence' : 'audio-frequency'}>
            {tone.isSilent ? 'Silence (missing reading)' : `${frequencyLabel} · ${tone.pitchLabel}`}
          </strong>
        </div>
        <p>{soundDescription}</p>
      </div>

      {hasMissingReading && (
        <p className="field-hint audio-missing-note">
          This month has no reported anomaly. The timeline keeps the gap instead of substituting
          zero, and the audio engine stays silent for this step.
        </p>
      )}

      {error && (
        <p className="inline-alert" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </p>
      )}

      <section className="audio-legend" aria-labelledby="audio-legend-heading">
        <h3 id="audio-legend-heading">How data becomes sound</h3>
        <dl className="audio-legend-grid">
          <div>
            <dt>Pitch · temperature anomaly</dt>
            <dd>
              A fixed range is used for every year: <strong>−2.0 °C = 220 Hz</strong> (A3),{' '}
              <strong>0.0 °C = 440 Hz</strong> (A4, the 1951–1980 baseline) and{' '}
              <strong>+2.0 °C = 880 Hz</strong> (A5). Higher anomalies sound higher.
            </dd>
          </div>
          <div>
            <dt>Rhythm · time progression</dt>
            <dd>
              Each month is one short note. The playback-speed control changes both the visual
              timeline and the audio tempo; at 1× a month lasts 620 ms.
            </dd>
          </div>
          <div>
            <dt>Year boundary</dt>
            <dd>A soft bell accent marks the first month of a later year.</dd>
          </div>
          <div>
            <dt>Missing data</dt>
            <dd>
              A month without a reported anomaly is silence. Missing values are never converted to
              0 °C or to an invented pitch.
            </dd>
          </div>
        </dl>
        <p className="audio-legend-note">
          The pitch range is fixed so any two months can be compared directly. Values beyond the
          range are clamped to the nearest pitch while the displayed anomaly remains exact.
        </p>
      </section>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {soundDescription}
      </p>

      <p className="audio-contract">
        Synthesized locally with the Web Audio API. No audio files or third-party services are
        used. Press <kbd>Escape</kbd> while playing for an immediate stop.
      </p>
    </section>
  )
}
