/**
 * Derived climate helpers.
 *
 * These functions only aggregate the records supplied by the existing
 * temperature service. They never invent or extrapolate values.
 */

export function buildAnnualSeries(records) {
  if (!Array.isArray(records)) {
    return []
  }

  const byYear = new Map()

  for (const record of records) {
    if (!Number.isFinite(record?.anomaly)) {
      continue
    }

    const current = byYear.get(record.year) ?? { year: record.year, total: 0, count: 0 }
    current.total += record.anomaly
    current.count += 1
    byYear.set(record.year, current)
  }

  return [...byYear.values()]
    .map(({ year, total, count }) => ({
      year,
      value: total / count,
      count,
    }))
    .sort((a, b) => a.year - b.year)
}

export function getWarmestAnnual(annualSeries) {
  if (!Array.isArray(annualSeries) || annualSeries.length === 0) {
    return null
  }

  return annualSeries.reduce((warmest, point) => (point.value > warmest.value ? point : warmest))
}

export function getCoolestAnnual(annualSeries) {
  if (!Array.isArray(annualSeries) || annualSeries.length === 0) {
    return null
  }

  return annualSeries.reduce((coolest, point) => (point.value < coolest.value ? point : coolest))
}
