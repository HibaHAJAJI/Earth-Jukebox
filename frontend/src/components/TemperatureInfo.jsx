import { BookOpen, CalendarRange, ExternalLink, Info, Thermometer } from 'lucide-react'
import { formatAnomaly, isMissingAnomaly } from '../services/temperatureService'
import { formatMonthYear, getAnomalyTone } from '../utils/format'

export default function TemperatureInfo({ selectedRecord, metadata }) {
  const unit = metadata?.unit ?? '°C'
  const baseline = metadata?.baseline ?? '1951-1980'
  const tone = getAnomalyTone(selectedRecord?.anomaly)
  const hasReading = selectedRecord && !isMissingAnomaly(selectedRecord.anomaly)
  const isMock = metadata?.isMock === true

  const relation = !selectedRecord
    ? 'Select a month to compare its anomaly with the baseline.'
    : !hasReading
      ? `No anomaly value was reported for this month. The gap is preserved and is not treated as 0 °C against the ${baseline} baseline.`
      : tone === 'positive'
        ? `This value is above the ${baseline} baseline.`
        : tone === 'negative'
          ? `This value is below the ${baseline} baseline.`
          : `This value is close to the ${baseline} baseline.`

  return (
    <section className="panel info-panel" aria-labelledby="info-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Scientific context</p>
          <h2 id="info-heading">How to read this anomaly</h2>
        </div>
      </div>

      <div className="info-grid">
        <article className="info-card">
          <span className="info-icon" aria-hidden="true">
            <Thermometer size={19} />
          </span>
          <h3>What is a temperature anomaly?</h3>
          <p>
            An anomaly is the difference between a measured temperature and a long-term reference
            average. It helps reveal change over time without mixing it with each location&apos;s
            normal climate.
          </p>
        </article>

        <article className="info-card">
          <span className="info-icon" aria-hidden="true">
            <CalendarRange size={19} />
          </span>
          <h3>Why the 1951–1980 baseline?</h3>
          <p>
            The 1951–1980 reference period is a common GISTEMP baseline. An anomaly of 0 °C means
            the selected month matches the average of that reference period.
          </p>
        </article>

        <article className="info-card">
          <span className="info-icon" aria-hidden="true">
            <BookOpen size={19} />
          </span>
          <h3>Reading the selected month</h3>
          <p>
            {selectedRecord
              ? `${formatMonthYear(selectedRecord)} has an anomaly of ${formatAnomaly(
                  selectedRecord.anomaly,
                  unit,
                )}. ${relation}`
              : 'Choose a month on the timeline to see its anomaly and how it compares with the baseline.'}
          </p>
        </article>
      </div>

      <div className="reading-summary">
        <div>
          <span className="reading-label">Selected reading</span>
          <strong>{formatMonthYear(selectedRecord)}</strong>
          <span className="reading-relation">{relation}</span>
        </div>
        <span className={`reading-value tone-${tone}`}>
          {formatAnomaly(selectedRecord?.anomaly, unit)}
        </span>
      </div>

      <div className="info-footer">
        <div className="value-legend" aria-label="Anomaly value legend">
          <span className="value-legend-title">Anomaly scale</span>
          <span className="value-key tone-negative">
            <span aria-hidden="true">−</span> Below baseline
          </span>
          <span className="value-key tone-neutral">
            <span aria-hidden="true">~</span> Near baseline
          </span>
          <span className="value-key tone-positive">
            <span aria-hidden="true">+</span> Above baseline
          </span>
        </div>

        <div className="source-credit">
          <Info size={15} aria-hidden="true" />
          <p>
            {isMock ? (
              <>
                <strong>Temporary mock dataset.</strong> The interface is prepared for verified
                monthly data from{' '}
                <a
                  href="https://data.giss.nasa.gov/gistemp/data_v4.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA GISS GISTEMP v4
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
                . It does not currently display official NASA measurements.
              </>
            ) : (
              <>
                <strong>{metadata?.source ?? 'NASA GISS GISTEMP v4'}.</strong> Values use the{' '}
                {baseline} reference baseline and are reported in {unit}.{' '}
                <a
                  href={metadata?.sourceUrl ?? 'https://data.giss.nasa.gov/gistemp/data_v4.html'}
                  target="_blank"
                  rel="noreferrer"
                >
                  View the official data page
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
                .
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
