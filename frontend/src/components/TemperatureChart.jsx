import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info } from 'lucide-react'
import { formatAnomaly, isMissingAnomaly } from '../services/temperatureService'
import { formatDecimalYear, formatMonthYear, getAnomalyTone } from '../utils/format'

function ChartTooltip({ active, payload, unit, isMock }) {
  if (!active || !payload?.length) {
    return null
  }

  const record = payload[0].payload
  const isMissing = isMissingAnomaly(record.anomaly)

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{formatMonthYear(record)}</p>
      <p className={`chart-tooltip-value tone-${getAnomalyTone(record.anomaly)}`}>
        {formatAnomaly(record.anomaly, unit)}
      </p>
      <p className="chart-tooltip-note">
        {isMissing
          ? 'No reported anomaly — gap preserved'
          : isMock
            ? 'Illustrative mock value'
            : 'NASA GISS GISTEMP v4'}
      </p>
    </div>
  )
}

export default function TemperatureChart({ records, selectedRecord, metadata }) {
  const isMock = metadata?.isMock === true
  const unit = metadata?.unit ?? '°C'
  const baseline = metadata?.baseline ?? '1951-1980'
  const missingCount =
    metadata?.missingCount ?? records.filter((record) => isMissingAnomaly(record.anomaly)).length
  const hasSelectedReading = selectedRecord && !isMissingAnomaly(selectedRecord.anomaly)
  const hasAnyReading = records.some((record) => !isMissingAnomaly(record.anomaly))

  const chartData = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        date: formatDecimalYear(record),
      })),
    [records],
  )

  const ticks = useMemo(() => {
    if (records.length === 0) {
      return []
    }

    const start = records[0].year
    const end = records[records.length - 1].year

    return Array.from({ length: Math.floor((end - start) / 20) + 1 }, (_, index) => start + index * 20)
      .concat(end)
      .filter((year, index, list) => list.indexOf(year) === index)
  }, [records])

  const selectedDate = selectedRecord ? formatDecimalYear(selectedRecord) : null
  const rangeLabel =
    records.length > 0
      ? `${formatMonthYear(records[0])} – ${formatMonthYear(records[records.length - 1])}`
      : null

  return (
    <section className="panel chart-panel" aria-labelledby="chart-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Time series</p>
          <h2 id="chart-heading">Monthly temperature anomaly</h2>
          <p className="panel-description">
            {records.length.toLocaleString()} monthly readings
            {rangeLabel ? ` · ${rangeLabel}` : ''}
            {missingCount > 0 ? ` · ${missingCount.toLocaleString()} missing values kept as gaps` : ''}
            {' · '}reference baseline {baseline}
          </p>
        </div>
        {isMock && (
          <span className="data-badge data-badge--warning">
            <Info size={13} aria-hidden="true" />
            MOCK DATA
          </span>
        )}
      </div>

      {selectedRecord && (
        <div className="chart-selection" aria-live="polite">
          <span className="chart-selection-dot" aria-hidden="true" />
          <span>
            Highlighted: <strong>{formatMonthYear(selectedRecord)}</strong>
          </span>
          <span className={`chart-selection-value tone-${getAnomalyTone(selectedRecord.anomaly)}`}>
            {formatAnomaly(selectedRecord.anomaly, unit)}
          </span>
        </div>
      )}

      <div
        className="chart-wrap"
        role="img"
        aria-label={
          selectedRecord
            ? `Monthly temperature anomaly chart. Selected: ${formatMonthYear(selectedRecord)}, ${formatAnomaly(selectedRecord.anomaly, unit)}. ${isMock ? 'The full series is illustrative mock data, not official NASA measurements.' : 'Data source: NASA GISS GISTEMP v4.'}`
            : `Monthly temperature anomaly chart. ${isMock ? 'Illustrative mock data.' : 'Data source: NASA GISS GISTEMP v4.'}`
        }
      >
        {chartData.length > 0 && hasAnyReading ? (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData} margin={{ top: 16, right: 18, left: -8, bottom: 8 }}>
              <defs>
                <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.42} />
                  <stop offset="55%" stopColor="#818cf8" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="temperatureStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="52%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#67e8f9" />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 6" vertical={false} />
              <XAxis
                dataKey="date"
                type="number"
                domain={['dataMin', 'dataMax']}
                ticks={ticks}
                tickFormatter={(value) => Math.round(value)}
                tick={{ fill: '#8ea1c4', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.24)' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: '#8ea1c4', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}°`}
              />
              <Tooltip
                content={<ChartTooltip unit={unit} isMock={isMock} />}
                cursor={{ stroke: 'rgba(103, 232, 249, 0.45)', strokeWidth: 1, strokeDasharray: '3 4' }}
              />
              <ReferenceLine
                y={0}
                stroke="rgba(226, 232, 240, 0.38)"
                strokeDasharray="5 5"
                label={{
                  value: `${baseline} baseline`,
                  position: 'insideBottomLeft',
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
              <Area
                type="monotone"
                dataKey="anomaly"
                stroke="url(#temperatureStroke)"
                strokeWidth={2}
                fill="url(#temperatureFill)"
                dot={false}
                activeDot={{ r: 4, fill: '#67e8f9', stroke: '#060b18', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {selectedRecord && selectedDate !== null && (
                <>
                  <ReferenceLine
                    x={selectedDate}
                    stroke="rgba(103, 232, 249, 0.72)"
                    strokeDasharray="3 5"
                    strokeWidth={1.5}
                  />
                  {hasSelectedReading && (
                    <ReferenceDot
                      x={selectedDate}
                      y={selectedRecord.anomaly}
                      r={6}
                      fill="#67e8f9"
                      stroke="#060b18"
                      strokeWidth={2.5}
                      ifOverflow="extendDomain"
                    />
                  )}
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <Info size={22} aria-hidden="true" />
            <p>
              {records.length === 0
                ? 'No valid monthly readings are available for this chart.'
                : 'The dataset contains no numeric anomaly values. Missing values are not plotted as zero.'}
            </p>
          </div>
        )}
      </div>

      <div className="chart-footer">
        <ul className="chart-legend" aria-label="Chart legend">
          <li>
            <span className="legend-line legend-line--series" aria-hidden="true" />
            Monthly anomaly
          </li>
          <li>
            <span className="legend-line legend-line--selected" aria-hidden="true" />
            Selected month
          </li>
          <li>
            <span className="legend-line legend-line--baseline" aria-hidden="true" />
            {baseline} baseline (0 °C)
          </li>
          {missingCount > 0 && (
            <li>
              <span className="legend-line legend-line--gap" aria-hidden="true" />
              Missing value (gap, not zero)
            </li>
          )}
        </ul>
        <p className="chart-disclaimer">
          {isMock
            ? 'Values shown are generated placeholder data for interface development, not official NASA measurements.'
            : `Monthly anomaly values from ${metadata?.source ?? 'NASA GISS GISTEMP v4'}. Missing months are shown as gaps and are never replaced with zero.`}
        </p>
      </div>
    </section>
  )
}

