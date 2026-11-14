import mockTemperatureData from '../data/mockTemperatureData'

/**
 * DATA INTEGRATION POINT
 *
 * The data team can provide the verified monthly dataset in two ways:
 *
 *   1. Set VITE_TEMPERATURE_DATA_URL to a JSON URL (local file or API):
 *        VITE_TEMPERATURE_DATA_URL=/data/temperature.json
 *        VITE_TEMPERATURE_DATA_URL=http://localhost:8080/api/temperature
 *
 *   2. Replace the mock import above with a verified JSON module committed
 *      under src/data.
 *
 * The rest of the app only depends on the normalized shape:
 *   { metadata: {...}, data: [{ year, month, anomaly }] }
 *
 * `anomaly` may be null when NASA reports a missing value (for example `***`).
 * Missing values are never converted to zero.
 */

export const DEFAULT_METADATA = {
  source: 'NASA GISS GISTEMP v4',
  unit: '°C',
  frequency: 'monthly',
  baseline: '1951-1980',
  sourceUrl: 'https://data.giss.nasa.gov/gistemp/data_v4.html',
}

const MISSING_TOKEN_PATTERN = /^\*+$/

function getConfiguredDataUrl() {
  const value = import.meta.env?.VITE_TEMPERATURE_DATA_URL
  return typeof value === 'string' ? value.trim() : ''
}

export function parseAnomaly(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (
      trimmed === '' ||
      MISSING_TOKEN_PATTERN.test(trimmed) ||
      trimmed.toLowerCase() === 'nan' ||
      trimmed.toLowerCase() === 'null'
    ) {
      return null
    }

    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function isMissingAnomaly(value) {
  return parseAnomaly(value) === null
}

function normalizeRecord(record) {
  if (!record) {
    return null
  }

  const year = Number(record.year)
  const month = Number(record.month)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return {
    year,
    month,
    anomaly: parseAnomaly(record.anomaly),
  }
}

export function normalizeRecords(rawData) {
  if (!Array.isArray(rawData)) {
    return []
  }

  const byMonth = new Map()

  for (const rawRecord of rawData) {
    const record = normalizeRecord(rawRecord)

    if (!record) {
      continue
    }

    byMonth.set(`${record.year}-${record.month}`, record)
  }

  return [...byMonth.values()].sort((a, b) => a.year - b.year || a.month - b.month)
}

export function isValidRecord(record) {
  if (!record) {
    return false
  }

  return (
    Number.isInteger(record.year) &&
    Number.isInteger(record.month) &&
    record.month >= 1 &&
    record.month <= 12 &&
    typeof record.anomaly === 'number' &&
    Number.isFinite(record.anomaly)
  )
}

export function normalizeDataset(input, { forceMock = false } = {}) {
  const rawData = Array.isArray(input) ? input : input?.data
  const rawMetadata = Array.isArray(input) ? {} : (input?.metadata ?? {})
  const records = normalizeRecords(rawData)

  const years = records.map((record) => record.year)
  const startYear = rawMetadata.startYear ?? (years.length ? Math.min(...years) : null)
  const endYear = rawMetadata.endYear ?? (years.length ? Math.max(...years) : null)
  const missingCount = records.filter((record) => record.anomaly === null).length

  return {
    metadata: {
      ...DEFAULT_METADATA,
      ...rawMetadata,
      source: rawMetadata.source ?? DEFAULT_METADATA.source,
      unit: rawMetadata.unit ?? DEFAULT_METADATA.unit,
      frequency: rawMetadata.frequency ?? DEFAULT_METADATA.frequency,
      baseline: rawMetadata.baseline ?? DEFAULT_METADATA.baseline,
      sourceUrl: rawMetadata.sourceUrl ?? DEFAULT_METADATA.sourceUrl,
      isMock: forceMock || rawMetadata.isMock === true,
      startYear,
      endYear,
      recordCount: records.length,
      missingCount,
    },
    data: records,
  }
}

export async function fetchTemperatureDataset() {
  const dataUrl = getConfiguredDataUrl()

  if (!dataUrl) {
    // No verified source configured yet: use clearly labelled mock data.
    return normalizeDataset(mockTemperatureData, { forceMock: true })
  }

  let response

  try {
    response = await fetch(dataUrl, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error(
      `Could not reach the configured temperature dataset at ${dataUrl}. Check that the data service is running and the URL is correct.`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `The temperature dataset request failed with HTTP ${response.status}. Expected a JSON response at ${dataUrl}.`,
    )
  }

  let payload

  try {
    payload = await response.json()
  } catch {
    throw new Error(`The temperature dataset at ${dataUrl} is not valid JSON.`)
  }

  const dataset = normalizeDataset(payload)

  if (dataset.data.length === 0) {
    throw new Error(
      'The temperature dataset loaded but contained no valid year/month records. Check the data format.',
    )
  }

  return dataset
}

export function getMonthlyData(dataset) {
  return normalizeRecords(dataset?.data)
}

export function findRecordByYearMonth(data, year, month) {
  if (!Array.isArray(data)) {
    return null
  }

  return data.find((record) => record.year === year && record.month === month) ?? null
}

export function findRecordIndexByYearMonth(data, year, month) {
  if (!Array.isArray(data)) {
    return -1
  }

  return data.findIndex((record) => record.year === year && record.month === month)
}

export function getDatasetMetadata(dataset) {
  return dataset?.metadata ?? null
}

export function getYearOptions(data) {
  if (!Array.isArray(data)) {
    return []
  }

  return [...new Set(data.map((record) => record.year))].sort((a, b) => a - b)
}

export function getMonthOptionsForYear(data, year) {
  if (!Array.isArray(data)) {
    return []
  }

  return [
    ...new Set(
      data.filter((record) => record.year === year).map((record) => record.month),
    ),
  ].sort((a, b) => a - b)
}

export function formatAnomaly(anomaly, unit = '°C') {
  if (typeof anomaly !== 'number' || !Number.isFinite(anomaly)) {
    return 'Unavailable'
  }

  const sign = anomaly > 0 ? '+' : ''
  return `${sign}${anomaly.toFixed(2)} ${unit}`
}
