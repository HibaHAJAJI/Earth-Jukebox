import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Pause, Play, Radio, Square, Volume1, Volume2, VolumeX } from 'lucide-react'
import useSonificationEngine from '../hooks/useSonificationEngine'
import { formatAnomaly, isMissingAnomaly } from '../services/temperatureService'
import { formatMonthYear, getAnomalyTone } from '../utils/format'

export default function AudioControls({
  selectedRecord,
  metadata,
  isPlaying = false,
  onPlay,
  onPause,
  onStop,
}) {
  const { engine, isConnected } = useSonificationEngine()
  const [volume, setVolume] = useState(70)
  const [playbackStatus, setPlaybackStatus] = useState('idle')
  const [error, setError] = useState(null)
  const selectedRecordRef = useRef(selectedRecord)
  const wasPlayingRef = useRef(false)
  const unit = metadata?.unit ?? '°C'
  const hasMissingReading = Boolean(selectedRecord) && isMissingAnomaly(selectedRecord.anomaly)

  useEffect(() => {
    selectedRecordRef.current = selectedRecord
  }, [selectedRecord])

  // The selected month is the single source of truth: every change is pushed
  // to the engine without restarting playback.
  useEffect(() => {
    engine.updateData(selectedRecord)
  }, [engine, selectedRecord])

  useEffect(() => {
    engine.setVolume(volume / 100)
  }, [engine, volume])

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
          setPlaybackStatus('idle')
          setError(
            playbackError instanceof Error ? playbackError.message : 'Unable to sync audio playback.',
          )
        }
      }
    }

    syncPlayback()

    return () => {
      request.cancelled = true
    }
  }, [engine, isConnected, isPlaying])

  async function handlePlay() {
    if (!isConnected) {
      return
    }

    setError(null)

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
      setError(playbackError instanceof Error ? playbackError.message : 'Unable to start audio.')
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

    try {
      await engine.stop()
      setPlaybackStatus('idle')
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Unable to stop audio.')
    } finally {
      wasPlayingRef.current = false
      onStop?.()
    }
  }

  const statusText = !isConnected
    ? 'Not connected'
    : error
      ? 'Audio error'
      : isPlaying && playbackStatus === 'starting'
        ? 'Starting audio'
        : isPlaying
          ? 'Audio engine connected'
          : 'Audio engine ready'

  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2

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
            {isConnected ? 'Sonification engine connected' : 'Sonification engine not connected yet'}
          </strong>
          <p>
            {isConnected
              ? 'Audio playback follows the shared timeline. The selected month is sent to the engine whenever it changes.'
              : 'The audio layer is being built by the sonification team. Until it is connected, no audio is generated or played.'}
          </p>
        </div>
      </div>

      <div className="audio-transport" role="group" aria-label="Audio playback controls">
        <button
          type="button"
          className="control-button control-button--primary"
          onClick={handlePlay}
          disabled={!isConnected || isPlaying}
          aria-label="Play sonification for the selected month"
        >
          <Play size={16} aria-hidden="true" />
          Play
        </button>
        <button
          type="button"
          className="control-button"
          onClick={handlePause}
          disabled={!isConnected || !isPlaying}
          aria-label="Pause sonification"
        >
          <Pause size={16} aria-hidden="true" />
          Pause
        </button>
        <button
          type="button"
          className="control-button"
          onClick={handleStop}
          disabled={!isConnected}
          aria-label="Stop sonification and reset the timeline"
        >
          <Square size={14} aria-hidden="true" />
          Stop
        </button>
      </div>

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
          />
          <VolumeIcon size={18} aria-hidden="true" />
        </div>
        <p className="field-hint">
          {isConnected
            ? 'Volume is sent to the connected audio engine.'
            : 'This setting will be passed to the audio engine once available.'}
        </p>
      </div>

      <div className="audio-data-preview">
        <div>
          <span>Data queued for audio</span>
          <strong>{formatMonthYear(selectedRecord)}</strong>
        </div>
        <span
          className={`audio-anomaly tone-${getAnomalyTone(selectedRecord?.anomaly)}`}
        >
          {formatAnomaly(selectedRecord?.anomaly, unit)}
        </span>
      </div>

      {hasMissingReading && (
        <p className="field-hint audio-missing-note">
          This month has no reported anomaly. The timeline keeps the gap instead of substituting
          zero, and audio cannot map a value until a reading is available.
        </p>
      )}

      {error && (
        <p className="inline-alert" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </p>
      )}

      <p className="audio-contract">
        Integration contract: <code>play(record)</code>, <code>pause()</code>, <code>stop()</code>,{' '}
        <code>setVolume(0–1)</code>, <code>updateData(record)</code>. See{' '}
        <code>INTEGRATION.md</code>.
      </p>
    </section>
  )
}
