import { formatAnomaly } from '../../services/temperatureService'
import { Info } from 'lucide-react'

const STRIPE_STOPS = [
  [0, '#1e3a8a'],
  [0.16, '#2563eb'],
  [0.34, '#22d3ee'],
  [0.5, '#e2e8f0'],
  [0.66, '#fbbf24'],
  [0.82, '#f97316'],
  [1, '#dc2626'],
]

function hexToRgb(hex) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16))
}

function interpolateColor(stops, progress) {
  for (let index = 1; index < stops.length; index += 1) {
    if (progress <= stops[index][0]) {
      const [startPosition, startColor] = stops[index - 1]
      const [endPosition, endColor] = stops[index]
      const distance = endPosition - startPosition || 1
      const amount = (progress - startPosition) / distance
      const start = hexToRgb(startColor)
      const end = hexToRgb(endColor)
      const mixed = start.map((channel, channelIndex) =>
        Math.round(channel + (end[channelIndex] - channel) * amount),
      )
      return `rgb(${mixed.join(', ')})`
    }
  }

  return stops[stops.length - 1][1]
}

function getStripeColor(value, maxAbs) {
  if (!Number.isFinite(value) || maxAbs <= 0) {
    return '#475569'
  }

  const progress = (value + maxAbs) / (maxAbs * 2)
  return interpolateColor(STRIPE_STOPS, Math.min(1, Math.max(0, progress)))
}

export default function WarmingStripes({ annualSeries, selectedYear, metadata }) {
  const unit = metadata?.unit ?? '°C'
  const baseline = metadata?.baseline ?? '1951-1980'
  const isMock = metadata?.isMock === true

  if (!Array.isArray(annualSeries) || annualSeries.length === 0) {
    return (
      <div className="home-stripes-empty" role="status">
        <Info size={18} aria-hidden="true" />
        <p>Annual values are not available yet. The stripes will appear once the dataset is ready.</p>
      </div>
    )
  }

  const values = annualSeries.map((point) => point.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const maxAbs = Math.max(Math.abs(minimum), Math.abs(maximum), 0.01)
  const firstYear = annualSeries[0].year
  const lastYear = annualSeries[annualSeries.length - 1].year
  const selectedPoint = annualSeries.find((point) => point.year === selectedYear) ?? null
  const selectedLabel = selectedPoint
    ? ` Selected year ${selectedPoint.year}: ${formatAnomaly(selectedPoint.value, unit)}.`
    : ''

  return (
    <figure className="home-stripes-figure">
      <div className="home-stripes-head">
        <div>
          <span className="home-stripes-label">Observed annual mean</span>
          <strong>
            {firstYear} → {lastYear}
          </strong>
        </div>
        <div className="home-stripes-head-meta">
          <span>{formatAnomaly(minimum, unit)}</span>
          <span className="home-stripes-divider" aria-hidden="true" />
          <span>{formatAnomaly(maximum, unit)}</span>
          {isMock && <span className="home-stripes-mock">MOCK DATA</span>}
        </div>
      </div>

      <div
        className="home-stripes"
        role="img"
        aria-label={`Warming stripes of observed annual temperature anomalies from ${firstYear} to ${lastYear}. Minimum ${formatAnomaly(minimum, unit)}, maximum ${formatAnomaly(maximum, unit)}.${selectedLabel}${isMock ? ' The series is illustrative mock data, not official NASA measurements.' : ''}`}
      >
        {annualSeries.map((point) => (
          <span
            key={point.year}
            className={point.year === selectedYear ? 'is-selected' : undefined}
            style={{ background: getStripeColor(point.value, maxAbs) }}
            title={`${point.year}: ${formatAnomaly(point.value, unit)}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="home-stripes-scale">
        <span>Cooler</span>
        <span className="home-stripes-scale-bar" aria-hidden="true" />
        <span>Warmer</span>
      </div>

      <figcaption className="home-stripes-caption">
        <span>
          Each stripe is the mean of the observed months in that year. Missing values are excluded
          rather than replaced with zero. Colour is centred on 0 {unit} using the largest absolute
          anomaly in view. Anomalies use the {baseline} baseline in {unit}.
        </span>
        <span className="home-stripes-source">
          <Info size={14} aria-hidden="true" />
          {isMock
            ? 'Illustrative mock values — not NASA measurements.'
            : `Source: ${metadata?.source ?? 'NASA GISS GISTEMP v4'}.`}
        </span>
      </figcaption>
    </figure>
  )
}
