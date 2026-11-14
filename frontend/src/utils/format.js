export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTH_NAMES_SHORT = MONTH_NAMES.map((month) => month.slice(0, 3))

export function getMonthName(month) {
  return MONTH_NAMES[month - 1] ?? 'Unknown month'
}

export function getMonthNameShort(month) {
  return MONTH_NAMES_SHORT[month - 1] ?? '—'
}

export function formatMonthYear(record) {
  if (!record) {
    return 'No month selected'
  }

  return `${getMonthName(record.month)} ${record.year}`
}

export function getAnomalyTone(anomaly) {
  if (typeof anomaly !== 'number' || !Number.isFinite(anomaly)) {
    return 'unknown'
  }

  if (anomaly > 0.05) {
    return 'positive'
  }

  if (anomaly < -0.05) {
    return 'negative'
  }

  return 'neutral'
}

export function formatDecimalYear(record) {
  if (!record) {
    return 0
  }

  return record.year + (record.month - 1) / 12
}
