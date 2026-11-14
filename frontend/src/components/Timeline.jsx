import { ChevronLeft, ChevronRight, Clock3, Gauge, Pause, Play, Square } from 'lucide-react'
import { findRecordIndexByYearMonth } from '../services/temperatureService'
import { getMonthNameShort, MONTH_NAMES, formatMonthYear } from '../utils/format'

const SPEED_OPTIONS = [0.5, 1, 2, 4]

export default function Timeline({
  records,
  yearOptions,
  availableMonths = [],
  selectedRecord,
  currentIndex,
  total,
  progress,
  isPlaying,
  playbackSpeed = 1,
  baseline = '1951-1980',
  play,
  pause,
  stop,
  previous,
  next,
  setCurrentIndex,
  setPlaybackSpeed,
}) {
  const disabled = total === 0
  const isAtEnd = total > 0 && currentIndex === total - 1
  const statusLabel = disabled ? 'No data' : isPlaying ? 'Playing' : isAtEnd ? 'At end' : 'Paused'

  function handleYearChange(event) {
    const year = Number(event.target.value)
    const index = findRecordIndexByYearMonth(records, year, selectedRecord?.month ?? 1)

    if (index >= 0) {
      setCurrentIndex(index)
      return
    }

    const firstInYear = records.findIndex((record) => record.year === year)

    if (firstInYear >= 0) {
      setCurrentIndex(firstInYear)
    }
  }

  function handleMonthChange(event) {
    const month = Number(event.target.value)
    const index = findRecordIndexByYearMonth(records, selectedRecord?.year, month)

    if (index >= 0) {
      setCurrentIndex(index)
      return
    }

    const firstInYear = records.findIndex((record) => record.year === selectedRecord?.year)

    if (firstInYear >= 0) {
      setCurrentIndex(firstInYear)
    }
  }

  function handleScrub(event) {
    setCurrentIndex(Number(event.target.value))
  }

  const firstRecord = records[0]
  const lastRecord = records[records.length - 1]
  const firstLabel = firstRecord
    ? `${getMonthNameShort(firstRecord.month)} ${firstRecord.year}`
    : '—'
  const lastLabel = lastRecord ? `${getMonthNameShort(lastRecord.month)} ${lastRecord.year}` : '—'

  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-heading">
      <div className="panel-heading timeline-heading">
        <div>
          <p className="eyebrow">Interactive timeline</p>
          <h2 id="timeline-heading">Move through Earth&apos;s climate record</h2>
          <p className="panel-description">
            Scrub month by month or press play through {firstLabel} – {lastLabel}. The {baseline}{' '}
            baseline is a reference period used for anomalies, not the timeline range.
          </p>
        </div>
        <span
          className={`timeline-status${isPlaying ? ' is-playing' : ''}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      <div className="timeline-selects">
        <div className="field">
          <label htmlFor="timeline-year">Year</label>
          <select
            id="timeline-year"
            value={selectedRecord?.year ?? ''}
            onChange={handleYearChange}
            disabled={disabled}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="timeline-month">Month</label>
          <select
            id="timeline-month"
            value={selectedRecord?.month ?? ''}
            onChange={handleMonthChange}
            disabled={disabled}
          >
            {MONTH_NAMES.map((month, index) => {
              const monthNumber = index + 1
              const isAvailable =
                availableMonths.length === 0 || availableMonths.includes(monthNumber)

              return (
                <option key={month} value={monthNumber} disabled={!isAvailable}>
                  {month}
                  {!isAvailable ? ' (no reading)' : ''}
                </option>
              )
            })}
          </select>
        </div>

        <div className="field timeline-speed">
          <label htmlFor="timeline-speed">
            <Gauge size={13} aria-hidden="true" />
            Speed
          </label>
          <select
            id="timeline-speed"
            value={playbackSpeed}
            onChange={(event) => setPlaybackSpeed?.(Number(event.target.value))}
            disabled={disabled}
            aria-label="Timeline playback speed"
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
        </div>

        <div className="field timeline-reading">
          <span className="field-label">Selected month</span>
          <strong>{formatMonthYear(selectedRecord)}</strong>
        </div>
      </div>

      <div className="timeline-controls" role="group" aria-label="Timeline playback controls">
        <button
          type="button"
          className="icon-button"
          onClick={previous}
          disabled={disabled || currentIndex <= 0}
          aria-label="Previous month"
          title="Previous month"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="control-button control-button--primary"
          onClick={play}
          disabled={disabled || isPlaying}
          aria-label="Play timeline"
        >
          <Play size={16} aria-hidden="true" />
          Play
        </button>

        <button
          type="button"
          className="control-button"
          onClick={pause}
          disabled={disabled || !isPlaying}
          aria-label="Pause timeline"
        >
          <Pause size={16} aria-hidden="true" />
          Pause
        </button>

        <button
          type="button"
          className="control-button"
          onClick={stop}
          disabled={disabled}
          aria-label="Stop timeline and return to the first available month"
        >
          <Square size={14} aria-hidden="true" />
          Stop
        </button>

        <button
          type="button"
          className="icon-button"
          onClick={next}
          disabled={disabled || isAtEnd}
          aria-label="Next month"
          title="Next month"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="timeline-progress">
        <div className="timeline-progress-labels">
          <span>{firstLabel}</span>
          <span className="timeline-progress-count">
            <Clock3 size={13} aria-hidden="true" />
            Month {total > 0 ? currentIndex + 1 : 0} of {total}
          </span>
          <span>{lastLabel}</span>
        </div>
        <input
          className="timeline-range"
          type="range"
          min={0}
          max={Math.max(total - 1, 0)}
          step={1}
          value={currentIndex}
          onChange={handleScrub}
          disabled={disabled}
          aria-label="Timeline position"
          aria-valuetext={formatMonthYear(selectedRecord)}
          style={{ '--range-progress': `${progress}%` }}
        />
        <div className="timeline-progress-meta">
          <span>{Math.round(progress)}% of record</span>
          <span>
            Advances one month at a time · {playbackSpeed}× speed
          </span>
        </div>
      </div>
    </section>
  )
}
