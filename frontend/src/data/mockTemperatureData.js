/**
 * MOCK DATA — NOT OFFICIAL NASA MEASUREMENTS.
 *
 * This deterministic placeholder dataset exists only so the interface and
 * interactions can be developed before the real NASA GISS GISTEMP v4 JSON
 * arrives. Never present these values as scientific observations.
 *
 * Replace this module (or the service that consumes it) with the verified
 * monthly dataset from the data team. The public shape is documented below.
 */

const START_YEAR = 1880
const END_YEAR = 2024

function createSeededRandom(seed) {
  let state = seed >>> 0

  return function nextRandom() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const random = createSeededRandom(20260411)

// A few synthetic gaps demonstrate that missing values stay missing instead of
// becoming 0 °C. They are not claims about real NASA gaps.
const MISSING_MONTHS = new Set(['1880-2', '1937-7', '2011-11'])

const data = []

for (let year = START_YEAR; year <= END_YEAR; year += 1) {
  const progress = (year - START_YEAR) / (END_YEAR - START_YEAR)
  const trend = -0.34 + 1.36 * progress ** 1.45

  for (let month = 1; month <= 12; month += 1) {
    const seasonal = 0.09 * Math.sin(((month - 4) / 12) * Math.PI * 2)
    const noise = (random() - 0.5) * 0.16
    const warmEvent =
      (year === 1998 && month >= 2 && month <= 7) ||
      (year === 2016 && month >= 1 && month <= 5) ||
      (year === 2023 && month >= 7) ||
      (year === 2024 && month <= 4)
        ? 0.16
        : 0

    data.push({
      year,
      month,
      anomaly: MISSING_MONTHS.has(`${year}-${month}`)
        ? null
        : Number((trend + seasonal + noise + warmEvent).toFixed(2)),
    })
  }
}

const mockTemperatureData = {
  metadata: {
    source: 'MOCK DATA — illustrative placeholder',
    officialSource: 'NASA GISS GISTEMP v4',
    sourceUrl: 'https://data.giss.nasa.gov/gistemp/data_v4.html',
    unit: '°C',
    frequency: 'monthly',
    baseline: '1951-1980',
    startYear: START_YEAR,
    endYear: END_YEAR,
    isMock: true,
    disclaimer:
      'Synthetic values generated for frontend development. They are not verified NASA measurements and must not be cited as scientific data.',
  },
  data,
}

export default mockTemperatureData
