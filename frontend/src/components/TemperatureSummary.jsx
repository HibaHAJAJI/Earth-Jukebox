import { CalendarDays, Scale, Thermometer } from 'lucide-react'
import { formatAnomaly, isMissingAnomaly } from '../services/temperatureService'
import { formatMonthYear, getAnomalyTone, getMonthName } from '../utils/format'

export default function TemperatureSummary({ selectedRecord, metadata }) {
  const unit = metadata?.unit ?? '°C'
  const baseline = metadata?.baseline ?? '1951-1980'
  const tone = getAnomalyTone(selectedRecord?.anomaly)
  const hasReading = selectedRecord && !isMissingAnomaly(selectedRecord.anomaly)
  const toneLabel = !selectedRecord
    ? 'No month selected'
    : !hasReading
      ? 'No reported value'
      : tone === 'positive'
        ? 'Above baseline'
        : tone === 'negative'
          ? 'Below baseline'
          : 'Near baseline'
  const toneSign = !hasReading ? '—' : tone === 'positive' ? '+' : tone === 'negative' ? '−' : '~'

  return (
    <section className="summary-grid" aria-label="Selected temperature summary">
      <article className="summary-card">
        <span className="summary-icon" aria-hidden="true">
          <CalendarDays size={20} />
        </span>
        <div>
          <span className="summary-label">Selected month</span>
          <strong className="summary-date">
            {selectedRecord ? getMonthName(selectedRecord.month) : '—'}
            <span>{selectedRecord?.year ?? '—'}</span>
          </strong>
          <span className="summary-note">Monthly record</span>
        </div>
      </article>

      <article className="summary-card summary-card--anomaly">
        <span className="summary-icon" aria-hidden="true">
          <Thermometer size={20} />
        </span>
        <div>
          <span className="summary-label">Temperature anomaly</span>
          <strong className={`summary-anomaly tone-${tone}`}>
            {formatAnomaly(selectedRecord?.anomaly, unit)}
          </strong>
          <span className={`summary-note tone-${tone}`}>
            <span aria-hidden="true">{toneSign}</span> {toneLabel}
          </span>
        </div>
      </article>

      <article className="summary-card">
        <span className="summary-icon" aria-hidden="true">
          <Scale size={20} />
        </span>
        <div>
          <span className="summary-label">Reference baseline</span>
          <strong className="summary-baseline">{baseline}</strong>
          <span className="summary-note">0 °C equals the baseline average</span>
        </div>
      </article>

      <div className="summary-context">
        <span>Showing</span>
        <strong>{formatMonthYear(selectedRecord)}</strong>
        {metadata?.isMock && <span className="summary-context-badge">MOCK DATA</span>}
      </div>
    </section>
  )
}
