import { useMemo } from 'react'
import { AlertTriangle, Database, ExternalLink, Info, LoaderCircle, RefreshCw } from 'lucide-react'
import useTemperatureData from '../hooks/useTemperatureData'
import useTimeline from '../hooks/useTimeline'
import AudioControls from '../components/AudioControls'
import TemperatureChart from '../components/TemperatureChart'
import TemperatureInfo from '../components/TemperatureInfo'
import TemperatureSummary from '../components/TemperatureSummary'
import Timeline from '../components/Timeline'
import { getMonthOptionsForYear, getYearOptions } from '../services/temperatureService'
import { formatMonthYear } from '../utils/format'

export default function Explore() {
  const { status, metadata, records, error, reload } = useTemperatureData()
  const timeline = useTimeline(records, {
    intervalMs: 620,
  })

  const yearOptions = useMemo(() => getYearOptions(records), [records])
  const availableMonths = useMemo(
    () => getMonthOptionsForYear(records, timeline.currentRecord?.year),
    [records, timeline.currentRecord?.year],
  )
  const datasetRange = useMemo(() => {
    if (records.length === 0) {
      return null
    }

    const firstRecord = records[0]
    const lastRecord = records[records.length - 1]

    return {
      firstRecord,
      lastRecord,
      label: `${formatMonthYear(firstRecord)} – ${formatMonthYear(lastRecord)}`,
      yearLabel: `${firstRecord.year} – ${lastRecord.year}`,
    }
  }, [records])
  const baseline = metadata?.baseline ?? '1951-1980'
  const isReady = status === 'ready' && records.length > 0

  return (
    <main id="main-content" className="explore-page">
      <div className="page-orb page-orb--cyan" aria-hidden="true" />
      <div className="page-orb page-orb--violet" aria-hidden="true" />

      <div className="container">
        <header className="explore-header">
          <div className="explore-header-copy">
            <span className="hero-badge hero-badge--static">
              <Database size={14} aria-hidden="true" />
              Earth Information Jukebox
            </span>
            <h1>Global Surface Temperature Anomaly</h1>
            <p>
              Explore how monthly surface temperatures compare with the 1951–1980 reference
              average. The selected month drives the summary, chart, scientific context and future
              audio layer.
            </p>
            <div className="source-row">
              <span className="source-pill">
                <span className="source-pill-dot" aria-hidden="true" />
                Source: NASA GISS GISTEMP v4
              </span>
              <a
                className="text-link"
                href="https://data.giss.nasa.gov/gistemp/data_v4.html"
                target="_blank"
                rel="noreferrer"
              >
                GISTEMP data page
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="explore-meta">
            <div>
              <span>Dataset period</span>
              <strong>{datasetRange?.yearLabel ?? '—'}</strong>
            </div>
            <div>
              <span>Reference baseline</span>
              <strong>{baseline}</strong>
            </div>
            <div>
              <span>Unit</span>
              <strong>{metadata?.unit ?? '°C'}</strong>
            </div>
            <div>
              <span>Frequency</span>
              <strong>{metadata?.frequency ?? 'monthly'}</strong>
            </div>
          </div>
        </header>

        {isReady && datasetRange && (
          <p className="range-explainer" role="note">
            <Info size={15} aria-hidden="true" />
            <span>
              <strong>Dataset period:</strong> {datasetRange.label} — every available monthly
              record in the supplied dataset. The <strong>{baseline}</strong> baseline is only the
              reference period used to calculate temperature anomalies; it is not the start or end
              of the timeline.
            </span>
          </p>
        )}

        {metadata?.isMock && (
          <div className="mock-banner" role="note">
            <Info size={18} aria-hidden="true" />
            <div>
              <strong>Temporary mock data</strong>
              <p>
                The values in this explorer are synthetic placeholders for frontend development.
                They are not verified NASA measurements and must not be presented as official
                scientific data.
              </p>
            </div>
            <span className="data-badge data-badge--warning">MOCK DATA</span>
          </div>
        )}

        {status === 'loading' && (
          <div className="state-panel" role="status" aria-live="polite">
            <LoaderCircle className="spin" size={26} aria-hidden="true" />
            <h2>Loading temperature record</h2>
            <p>Preparing the monthly dataset and timeline.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-panel state-panel--error" role="alert">
            <AlertTriangle size={28} aria-hidden="true" />
            <h2>We could not load the temperature dataset</h2>
            <p>{error}</p>
            <button
              type="button"
              className="button button--secondary"
              onClick={reload}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && records.length === 0 && (
          <div className="state-panel" role="status">
            <Info size={28} aria-hidden="true" />
            <h2>No monthly readings available</h2>
            <p>The dataset loaded without any valid year, month and anomaly records.</p>
          </div>
        )}

        {isReady && (
          <div className="explore-dashboard">
            <TemperatureSummary selectedRecord={timeline.currentRecord} metadata={metadata} />

            <TemperatureChart
              records={records}
              selectedRecord={timeline.currentRecord}
              metadata={metadata}
            />

            <Timeline
              records={records}
              yearOptions={yearOptions}
              availableMonths={availableMonths}
              selectedRecord={timeline.currentRecord}
              currentIndex={timeline.currentIndex}
              total={timeline.total}
              progress={timeline.progress}
              isPlaying={timeline.isPlaying}
              playbackSpeed={timeline.playbackSpeed}
              baseline={baseline}
              play={timeline.play}
              pause={timeline.pause}
              stop={timeline.stop}
              previous={timeline.previous}
              next={timeline.next}
              setCurrentIndex={timeline.setCurrentIndex}
              setPlaybackSpeed={timeline.setPlaybackSpeed}
            />

            <div className="explore-columns">
              <AudioControls
                selectedRecord={timeline.currentRecord}
                metadata={metadata}
                isPlaying={timeline.isPlaying}
                onPlay={timeline.play}
                onPause={timeline.pause}
                onStop={timeline.stop}
              />
              <TemperatureInfo selectedRecord={timeline.currentRecord} metadata={metadata} />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
