import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  Database,
  ExternalLink,
  Globe2,
  Headphones,
  Info,
  LineChart,
  LoaderCircle,
  Music,
  Play,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Thermometer,
  Waves,
} from 'lucide-react'
import AudioControls from '../components/AudioControls'
import ClimateVisual from '../components/home/ClimateVisual'
import CelestialVisual from '../components/home/CelestialVisual'
import WarmingStripes from '../components/home/WarmingStripes'
import TemperatureChart from '../components/TemperatureChart'
import Timeline from '../components/Timeline'
import useTemperatureData from '../hooks/useTemperatureData'
import useTimeline from '../hooks/useTimeline'
import {
  formatAnomaly,
  getMonthOptionsForYear,
  getYearOptions,
} from '../services/temperatureService'
import { buildAnnualSeries, getWarmestAnnual } from '../utils/climate'
import { formatMonthYear, getAnomalyTone } from '../utils/format'
import './Home.css'

const METHOD_STEPS = [
  {
    icon: Database,
    label: 'Observe',
    title: 'Start with the record',
    text: 'Monthly surface temperature anomalies are normalised into one chronological series.',
  },
  {
    icon: SlidersHorizontal,
    label: 'Translate',
    title: 'Map the measurements',
    text: 'Each reading is translated into musical parameters by the sonification engine.',
  },
  {
    icon: AudioWaveform,
    label: 'Listen',
    title: 'Hear the pattern',
    text: 'Pitch and movement make long-term change audible alongside the chart.',
  },
  {
    icon: Headphones,
    label: 'Explore',
    title: 'Keep the science visible',
    text: 'The chart, selected month and baseline stay visible while the audio layer plays.',
  },
]

const CLIMATE_CARDS = [
  {
    variant: 'earth',
    kicker: 'Orbital view',
    title: 'Earth from space',
    description:
      'A thin atmosphere, vast oceans and fragile ice cover make Earth sensitive to small changes in the energy it receives and retains.',
  },
  {
    variant: 'sun',
    kicker: 'Energy source',
    title: 'Sun & solar radiation',
    description:
      'Solar energy drives the climate system. The temperature record tracks how Earth’s surface responds to that energy over time.',
  },
  {
    variant: 'warming',
    kicker: 'Global warming',
    title: 'A warming planet',
    description:
      'Temperature anomalies show how each month compares with a fixed reference period, making long-term change easier to see.',
  },
  {
    variant: 'ocean',
    kicker: 'Oceans & ice',
    title: 'Ocean and ice changes',
    description:
      'Oceans and ice are central to the climate system. This build visualises the temperature record only; those datasets are not connected here.',
  },
]

export default function Home() {
  const { status, metadata, records, error, reload } = useTemperatureData()
  const timeline = useTimeline(records, { intervalMs: 620 })

  const yearOptions = useMemo(() => getYearOptions(records), [records])
  const availableMonths = useMemo(
    () => getMonthOptionsForYear(records, timeline.currentRecord?.year),
    [records, timeline.currentRecord?.year],
  )
  const annualSeries = useMemo(() => buildAnnualSeries(records), [records])
  const warmestAnnual = useMemo(() => getWarmestAnnual(annualSeries), [annualSeries])

  const isReady = status === 'ready' && records.length > 0
  const selectedRecord = timeline.currentRecord
  const latestRecord = records[records.length - 1] ?? null
  const baseline = metadata?.baseline ?? '1951-1980'
  const unit = metadata?.unit ?? '°C'
  const isMock = metadata?.isMock === true
  const sourceLabel = isMock
    ? 'Illustrative mock dataset'
    : (metadata?.source ?? 'NASA GISS GISTEMP v4')
  const coverageLabel =
    metadata?.startYear && metadata?.endYear
      ? `${metadata.startYear}–${metadata.endYear}`
      : records.length > 0
        ? `${records[0].year}–${records[records.length - 1].year}`
        : 'Loading'
  const recordCount = metadata?.recordCount ?? records.length
  const selectedTone = getAnomalyTone(selectedRecord?.anomaly)
  const latestTone = getAnomalyTone(latestRecord?.anomaly)

  return (
    <main id="main-content" className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-aurora" aria-hidden="true" />
        <div className="home-hero-stars" aria-hidden="true" />
        <div className="home-hero-grid-bg" aria-hidden="true" />

        <div className="home-container home-hero-grid">
          <div className="home-hero-copy">
            <span className="home-eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              NASA Space Apps Challenge 2026
            </span>

            <h1 className="home-hero-title" id="home-hero-title" aria-label="Earth Symphony">
              <span className="home-hero-title-line">Earth</span>
              <span className="home-hero-title-line home-hero-title-line--accent">Symphony</span>
            </h1>

            <p className="home-hero-lede">
              A cinematic journey through NASA’s temperature record — where climate data becomes
              light, motion and sound. Explore the planet one month at a time, then listen to the
              pattern behind the chart.
            </p>

            <div className="home-cta-row">
              <Link className="home-btn home-btn--primary" to="/explore">
                Explore Earth
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className="home-btn home-btn--ghost" href="#experience">
                <Play size={17} aria-hidden="true" />
                Listen to Earth
              </a>
            </div>

            <div className="home-hero-readout" aria-label="Scientific data preview">
              <div className="home-readout-head">
                <span className="home-readout-status">
                  <span className="home-readout-dot" aria-hidden="true" />
                  Data preview
                </span>
                <span className={`home-readout-source${isMock ? ' is-mock' : ''}`}>
                  {isMock ? 'MOCK DATA' : sourceLabel}
                </span>
              </div>
              <div className="home-readout-grid">
                <div>
                  <span>Latest reading</span>
                  <strong>{latestRecord ? formatMonthYear(latestRecord) : 'Loading record…'}</strong>
                </div>
                <div>
                  <span>Anomaly</span>
                  <strong className={`home-readout-value tone-${latestTone}`}>
                    {formatAnomaly(latestRecord?.anomaly, unit)}
                  </strong>
                </div>
                <div>
                  <span>Baseline</span>
                  <strong>{baseline}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="home-hero-visual">
            <CelestialVisual
              variant="hero"
              sourceLabel={isMock ? 'Illustrative dataset' : 'GISTEMP v4'}
              baseline={baseline}
            />
            <p className="home-hero-art-note">
              Original CSS/SVG artwork — not NASA imagery.
            </p>
          </div>
        </div>
      </section>

      <section className="home-section home-glance" id="glance" aria-labelledby="glance-heading">
        <div className="home-container">
          <div className="home-section-head">
            <p className="home-section-kicker">Climate at a glance</p>
            <h2 className="home-section-title" id="glance-heading">
              The planet’s <span className="home-text-cyan">temperature record</span>, in view.
            </h2>
            <p className="home-section-lead">
              A compact view of the data behind the experience. Every figure below is derived from
              the same monthly series used by the chart and the sonification timeline.
            </p>
            {isMock && (
              <span className="home-mock-pill">
                <Info size={13} aria-hidden="true" />
                Mock data — not NASA measurements
              </span>
            )}
          </div>

          <div className="home-glance-grid">
            <article className="home-stat-card home-stat-card--cyan">
              <span className="home-stat-icon" aria-hidden="true">
                <Globe2 size={21} />
              </span>
              <span className="home-stat-label">Dataset coverage</span>
              <strong className="home-stat-value">{coverageLabel}</strong>
              <span className="home-stat-note">Monthly surface temperature anomalies</span>
            </article>

            <article className="home-stat-card home-stat-card--blue">
              <span className="home-stat-icon" aria-hidden="true">
                <Database size={21} />
              </span>
              <span className="home-stat-label">Monthly readings</span>
              <strong className="home-stat-value">{recordCount.toLocaleString()}</strong>
              <span className="home-stat-note">Each point can be explored and sonified</span>
            </article>

            <article className="home-stat-card home-stat-card--sun">
              <span className="home-stat-icon" aria-hidden="true">
                <Thermometer size={21} />
              </span>
              <span className="home-stat-label">Warmest annual mean</span>
              <strong className="home-stat-value">
                {warmestAnnual ? formatAnomaly(warmestAnnual.value, unit) : '—'}
              </strong>
              <span className="home-stat-note">
                {warmestAnnual
                  ? `${warmestAnnual.year} · derived from the current dataset`
                  : 'Waiting for annual values'}
              </span>
            </article>

            <article className="home-stat-card home-stat-card--violet">
              <span className="home-stat-icon" aria-hidden="true">
                <LineChart size={21} />
              </span>
              <span className="home-stat-label">Reference baseline</span>
              <strong className="home-stat-value">{baseline}</strong>
              <span className="home-stat-note">
                0 °C is the reference average, not a global target
              </span>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section home-earth-sun" id="earth-sun" aria-labelledby="earth-sun-heading">
        <div className="home-container">
          <div className="home-orbit-panel">
            <div className="home-orbit-visual">
              <CelestialVisual
                variant="panel"
                sourceLabel={isMock ? 'Illustrative dataset' : 'GISTEMP v4'}
                baseline={baseline}
              />
            </div>

            <div className="home-orbit-copy">
              <p className="home-section-kicker">Earth & Sun</p>
              <h2 className="home-section-title" id="earth-sun-heading">
                One star. One planet. One continuous record.
              </h2>
              <p className="home-section-lead">
                Solar energy enters the Earth system and is redistributed by the atmosphere, oceans
                and ice. Temperature anomalies give us a way to follow the response over time.
              </p>

              <ul className="home-orbit-facts">
                <li>
                  <span aria-hidden="true">
                    <Sun size={18} />
                  </span>
                  <div>
                    <strong>Solar energy</strong>
                    <p>The Sun is the primary energy source for Earth’s climate system.</p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">
                    <Globe2 size={18} />
                  </span>
                  <div>
                    <strong>Atmosphere</strong>
                    <p>A thin layer of gas helps regulate how energy moves through the planet.</p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">
                    <Waves size={18} />
                  </span>
                  <div>
                    <strong>Oceans & ice</strong>
                    <p>Water and ice store and reflect energy, shaping the climate response.</p>
                  </div>
                </li>
              </ul>

              <p className="home-art-note">
                <Info size={14} aria-hidden="true" />
                Original CSS/SVG artwork created for Earth Symphony. Not official NASA imagery.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-chart-section" id="temperature" aria-labelledby="temperature-heading">
        <div className="home-container">
          <div className="home-chart-head-row">
            <div className="home-section-head">
              <p className="home-section-kicker">Global temperature</p>
              <h2 className="home-section-title" id="temperature-heading">
                Follow the <span className="home-text-cyan">monthly anomaly</span>.
              </h2>
              <p className="home-section-lead">
                Select any month to inspect its anomaly against the {baseline} baseline. The chart,
                timeline and audio layer all share the same selected record.
              </p>
            </div>

            {isReady && (
              <div className="home-chart-selected" aria-live="polite">
                <span>Selected month</span>
                <strong>{formatMonthYear(selectedRecord)}</strong>
                <b className={`tone-${selectedTone}`}>
                  {formatAnomaly(selectedRecord?.anomaly, unit)}
                </b>
              </div>
            )}
          </div>

          {status === 'loading' && (
            <div className="home-widget-state" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={26} aria-hidden="true" />
              <h3>Loading the temperature record</h3>
              <p>Preparing the monthly dataset for the chart and timeline.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="home-widget-state home-widget-state--error" role="alert">
              <AlertTriangle size={26} aria-hidden="true" />
              <h3>We could not load the temperature dataset</h3>
              <p>{error}</p>
              <button type="button" className="home-btn home-btn--ghost" onClick={reload}>
                <RefreshCw size={16} aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {status === 'ready' && records.length === 0 && (
            <div className="home-widget-state" role="status">
              <Info size={26} aria-hidden="true" />
              <h3>No monthly readings available</h3>
              <p>The dataset loaded without any valid year, month and anomaly records.</p>
            </div>
          )}

          {isReady && (
            <>
              <div className="home-chart-block">
                <TemperatureChart
                  records={records}
                  selectedRecord={selectedRecord}
                  metadata={metadata}
                />
              </div>

              <div className="home-chart-legend-note">
                <span>
                  <i className="home-legend-line home-legend-line--observed" aria-hidden="true" />
                  Observed monthly anomaly
                </span>
                <span>
                  <i className="home-legend-line home-legend-line--projected" aria-hidden="true" />
                  Projected / scenario series
                </span>
                <p>
                  The current dataset contains observed records only. No forecast or scenario line
                  is drawn.
                </p>
              </div>

              <div className="home-timeline-block">
                <Timeline
                  records={records}
                  yearOptions={yearOptions}
                  availableMonths={availableMonths}
                  selectedRecord={selectedRecord}
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
              </div>
            </>
          )}
        </div>
      </section>

      <section className="home-section home-stripes-section" id="stripes" aria-labelledby="stripes-heading">
        <div className="home-container">
          <div className="home-section-head">
            <p className="home-section-kicker">Warming stripes</p>
            <h2 className="home-section-title" id="stripes-heading">
              More than a century, <span className="home-text-sun">one stripe per year</span>.
            </h2>
            <p className="home-section-lead">
              Blue years sit below the long-term average; warmer colours sit above it. The selected
              year is highlighted in place so it can be compared with the full record.
            </p>
          </div>

          <WarmingStripes
            annualSeries={annualSeries}
            selectedYear={selectedRecord?.year}
            metadata={metadata}
          />
        </div>
      </section>

      <section className="home-section home-climate-section" id="climate" aria-labelledby="climate-heading">
        <div className="home-container">
          <div className="home-section-head">
            <p className="home-section-kicker">Explore climate</p>
            <h2 className="home-section-title" id="climate-heading">
              Four ways to <span className="home-text-cyan">see the system</span>.
            </h2>
            <p className="home-section-lead">
              Earth’s climate is more than one number. These visual sections frame the domains the
              temperature record belongs to.
            </p>
          </div>

          <div className="home-climate-grid">
            {CLIMATE_CARDS.map((card) => (
              <ClimateVisual key={card.variant} {...card} />
            ))}
          </div>

          <p className="home-art-note">
            <Info size={14} aria-hidden="true" />
            All Earth, Sun, warming and ocean visuals on this page are original CSS/SVG
            illustrations created for Earth Symphony. They are not NASA imagery. The current build
            visualises temperature data only; ocean and sea-ice datasets are not connected.
          </p>
        </div>
      </section>

      <section className="home-section home-experience" id="experience" aria-labelledby="experience-heading">
        <div className="home-container home-experience-grid">
          <div className="home-experience-copy">
            <p className="home-section-kicker">
              <Music size={14} aria-hidden="true" />
              Earth Symphony experience
            </p>
            <h2 className="home-section-title" id="experience-heading">
              See the record. <span className="home-text-sun">Hear the pattern.</span>
            </h2>
            <p className="home-section-lead">
              Sonification translates measurements into sound. Combined with the visual record, it
              offers a second way to notice magnitude, rhythm and long-term change.
            </p>

            <div
              className={`home-wave${timeline.isPlaying ? ' is-playing' : ''}`}
              aria-hidden="true"
            >
              {Array.from({ length: 34 }, (_, index) => (
                <span
                  key={index}
                  style={{
                    '--i': index,
                    '--bar': `${24 + ((index * 37) % 68)}%`,
                  }}
                />
              ))}
            </div>

            <div className="home-experience-readout">
              <span>Queued for the sonification engine</span>
              <strong>{formatMonthYear(selectedRecord)}</strong>
              <b className={`tone-${selectedTone}`}>
                {formatAnomaly(selectedRecord?.anomaly, unit)}
              </b>
            </div>

            <p className="home-experience-note">
              <Radio size={15} aria-hidden="true" />
              Audio is generated only by a registered sonification engine. Until one is connected,
              the interface reports that status instead of claiming sound is playing.
            </p>
          </div>

          <div className="home-experience-player">
            <AudioControls
              selectedRecord={selectedRecord}
              metadata={metadata}
              isPlaying={timeline.isPlaying}
              onPlay={timeline.play}
              onPause={timeline.pause}
              onStop={timeline.stop}
            />
          </div>
        </div>
      </section>

      <section className="home-section home-method" id="method" aria-labelledby="method-heading">
        <div className="home-container">
          <div className="home-section-head home-section-head--center">
            <p className="home-section-kicker">Scientific method</p>
            <h2 className="home-section-title" id="method-heading">
              How data becomes sound.
            </h2>
            <p className="home-section-lead">
              The chart remains the primary scientific reference. Audio is an additional layer that
              preserves the order and magnitude of the measurements.
            </p>
          </div>

          <div className="home-method-grid">
            {METHOD_STEPS.map((step, index) => (
              <article className="home-method-step" key={step.title}>
                <span className="home-method-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="home-method-icon" aria-hidden="true">
                  <step.icon size={21} strokeWidth={1.8} />
                </span>
                <span className="home-method-label">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>

          <div className="home-method-note">
            <AudioWaveform size={19} aria-hidden="true" />
            <p>
              <strong>Sound does not replace the science.</strong> The chart, baseline and selected
              record stay visible throughout the experience.
            </p>
            <Link to="/about">
              Read about the approach
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section home-sources" id="sources" aria-labelledby="sources-heading">
        <div className="home-container">
          <div className="home-sources-panel">
            <div className="home-sources-main">
              <p className="home-section-kicker">Sources & transparency</p>
              <h2 className="home-section-title" id="sources-heading">
                Scientific source and NASA disclaimer.
              </h2>
              <p className="home-section-lead">
                Earth Symphony combines a public temperature record with an original visual and
                sonification interface. Source, units and reference period stay visible wherever the
                data appears.
              </p>

              <ul className="home-source-list">
                <li>
                  <div>
                    <strong>Temperature data</strong>
                    <p>
                      NASA GISS Surface Temperature Analysis (GISTEMP v4), monthly anomalies in{' '}
                      {unit} against the {baseline} baseline.
                    </p>
                  </div>
                  <a
                    href={metadata?.sourceUrl ?? 'https://data.giss.nasa.gov/gistemp/data_v4.html'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GISTEMP v4 data page
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </li>
                <li>
                  <div>
                    <strong>Visuals</strong>
                    <p>
                      Earth, Sun and climate illustrations are original CSS/SVG artwork created for
                      this project. They are not NASA imagery.
                    </p>
                  </div>
                  <Link to="/about#data-sources">
                    Data sources
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </li>
                <li>
                  <div>
                    <strong>Audio</strong>
                    <p>
                      Sonification is provided through the project’s registered audio engine
                      contract. No sound is fabricated by the interface when no engine is connected.
                    </p>
                  </div>
                  <Link to="/about">
                    How it works
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </li>
              </ul>

              <div className="home-disclaimer" role="note">
                <strong>NASA disclaimer</strong>
                <p>
                  Earth Symphony is an independent hackathon project. It is not affiliated with,
                  endorsed by, or operated by NASA. NASA data and program names are credited to
                  their respective owners.
                </p>
              </div>
            </div>

            <aside className="home-source-aside">
              {isMock && (
                <div className="home-mock-warning">
                  <Info size={18} aria-hidden="true" />
                  <div>
                    <strong>Current dataset is mock data</strong>
                    <p>
                      The values on this page are synthetic placeholders for frontend development.
                      They are not verified NASA measurements and must not be cited as scientific
                      data.
                    </p>
                  </div>
                </div>
              )}

              <div className="home-source-card">
                <span>Dataset status</span>
                <strong>{isMock ? 'Illustrative mock data' : sourceLabel}</strong>
                <p>
                  {recordCount.toLocaleString()} monthly records · {coverageLabel} · reference
                  baseline {baseline}
                </p>
              </div>

              <Link className="home-btn home-btn--ghost" to="/about">
                Read the scientific method
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
