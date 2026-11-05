# Earth Symphony — Integration Guide

This document is the coordination contract between the frontend, the data
developer, the sonification developer, and the timeline/integration developer.

The frontend currently runs with clearly labelled mock data. No component
pretends that real NASA data or a real audio engine is connected.

---

## 1. Project layout

| Area | Files |
| --- | --- |
| Data contract + loading | `src/services/temperatureService.js` |
| Mock dataset | `src/data/mockTemperatureData.js` |
| Data loading hook | `src/hooks/useTemperatureData.js` |
| Shared timeline state | `src/hooks/useTimeline.js` |
| Timeline UI | `src/components/Timeline.jsx` |
| Chart | `src/components/TemperatureChart.jsx` |
| Selected-month summary | `src/components/TemperatureSummary.jsx` |
| Scientific context | `src/components/TemperatureInfo.jsx` |
| Audio integration seam | `src/services/sonificationService.js` |
| Audio UI | `src/components/AudioControls.jsx` |
| Audio engine subscription | `src/hooks/useSonificationEngine.js` |
| Explore page composition | `src/pages/Explore.jsx` |

---

## 2. Data developer contract

### 2.1 Expected JSON

Preferred shape:

```json
{
  "metadata": {
    "source": "NASA GISS GISTEMP v4",
    "unit": "°C",
    "frequency": "monthly",
    "baseline": "1951-1980",
    "startYear": 1880,
    "endYear": 2025,
    "isMock": false
  },
  "data": [
    { "year": 2020, "month": 1, "anomaly": 0.5 }
  ]
}
```

The example anomaly is illustrative only. It is not a verified NASA value.

A raw array is also accepted:

```json
[
  { "year": 2020, "month": 1, "anomaly": 0.5 }
]
```

Required record fields:

| Field | Type | Notes |
| --- | --- | --- |
| `year` | integer | Four-digit year. Numeric strings are also accepted. |
| `month` | integer | `1`–`12`. Numeric strings are also accepted. |
| `anomaly` | number or null | Degrees Celsius relative to the 1951–1980 baseline. |

Missing values:

- `null`, `""`, `"***"`, `"**"`, `"*"`, `"NaN"`, and `"null"` are treated as
  missing.
- Missing values are stored as `null` and rendered as gaps / “Unavailable”.
- Missing values are **never** converted to `0`.
- Duplicate `year` + `month` records are de-duplicated (the last one wins) and
  the dataset is sorted chronologically.

The service computes these metadata fields automatically:

- `recordCount`
- `missingCount`
- `startYear` / `endYear` (when not supplied)

### 2.2 Connecting the real dataset

Option A — URL (recommended for an API or a file served from `public/`):

Create `frontend/.env.local`:

```env
VITE_TEMPERATURE_DATA_URL=/data/temperature.json
```

or:

```env
VITE_TEMPERATURE_DATA_URL=http://localhost:8080/api/temperature
```

The URL must return the JSON shape above (or a raw array). If the request fails
or returns malformed JSON, the Explore page shows an error state with a Retry
button. It does **not** silently fall back to mock data when a URL is
configured, so verified and mock values are never mixed.

Restart the Vite dev server after creating or changing `.env.local`.

Option B — bundled JSON module:

1. Add the verified file to `src/data/` (for example
   `gistemp-monthly.json`).
2. Replace the mock import in `src/services/temperatureService.js` with the
   verified module, or pass it through `normalizeDataset(...)`.

Do not edit UI components to connect data. All data goes through
`temperatureService.js`.

### 2.3 Backend status

The current Spring Boot backend exposes:

- `GET /api/temperatures`
- `GET /api/temperatures/year/{year}`
- `GET /api/temperatures/range?startYear=…&endYear=…`

The current `TemperatureRecord` model has `year` and `anomaly` but **no
`month` field**. Before the frontend can consume it, the backend should:

1. Add `month` (`Integer`, 1–12) to `TemperatureRecord` and its DTO.
2. Return either a raw array of `{ year, month, anomaly }` records or a wrapper
   with `metadata` + `data`.
3. Keep CORS allowing `http://localhost:5173` (already configured in
   `CorsConfig.java`).

---

## 3. Sonification developer contract

### 3.1 Register the engine

Implement the engine object and register it once during app startup:

```js
import { registerSonificationEngine } from './services/sonificationService'

registerSonificationEngine({
  isConnected: true,

  // record = { year, month, anomaly } | null
  async play(record) {},
  async pause() {},
  async stop() {},

  // value = 0..1
  setVolume(value) {},

  // Called whenever the selected month changes.
  updateData(record) {},
})
```

The engine may be registered before or after React mounts. The UI subscribes to
registration changes and updates immediately.

### 3.2 When the frontend calls each method

| Method | When it is called |
| --- | --- |
| `play(record)` | Timeline enters the playing state (timeline Play or audio Play). |
| `pause()` | Timeline is paused. |
| `stop()` | Audio Stop button is pressed. |
| `setVolume(0..1)` | Volume slider changes or a new engine registers. |
| `updateData(record)` | The selected month changes, including while playing. |

Important:

- `updateData` should update the mapped data without restarting playback.
- `play`, `pause`, and `stop` should be safe to call more than once
  (idempotent), because React may re-run effects.
- If the engine cannot play (for example the browser blocked autoplay), reject
  the promise. The UI shows the error and never claims audio is playing.
- Do **not** generate audio in the frontend. The placeholder engine produces no
  sound.

### 3.3 Connection status

`AudioControls` shows one of:

- `Not connected` — no real engine registered; controls are disabled.
- `Audio engine ready` — engine registered and timeline is paused.
- `Starting audio` / `Audio engine connected` — engine accepted playback.
- `Audio error` — engine rejected a call.

The UI only reports “connected” when `engine.isConnected === true`.

---

## 4. Timeline / integration developer contract

There is exactly **one** timeline state instance, created in
`src/pages/Explore.jsx`:

```js
const timeline = useTimeline(records, {
  initialYear: 1980,
  initialMonth: 1,
  intervalMs: 620,
})
```

`useTimeline` returns:

| Field | Meaning |
| --- | --- |
| `currentIndex` | Index of the selected record in `records`. |
| `setCurrentIndex(index)` | Jump to an index and pause playback. |
| `currentRecord` | The selected `{ year, month, anomaly }` record. |
| `isPlaying` | Whether the timeline animation is running. |
| `play()` | Start from the current month, or restart from the beginning at the end. |
| `pause()` | Pause without changing the selected month. |
| `stop()` | Pause and reset to the first month. |
| `previous()` / `next()` | Move one month. |
| `progress` | 0–100 progress value. |
| `total` | Number of records. |
| `playbackSpeed` | Current multiplier (0.5×, 1×, 2×, 4×). |
| `setPlaybackSpeed(value)` | Change the multiplier. |

The chart, summary, scientific information, timeline UI, and audio layer all
receive the same `currentRecord` / `currentIndex`. Do not create a second
selected-index state in any component.

The animation advances one record at a time using a single `setInterval`, which
is cleared on pause, stop, unmount, or dataset change.

---

## 5. Files other team members should coordinate on

- Data: `src/services/temperatureService.js`, `src/data/`,
  `frontend/.env.local`, backend `TemperatureRecord` / controller / DTO.
- Sonification: `src/services/sonificationService.js`,
  `src/components/AudioControls.jsx`.
- Timeline: `src/hooks/useTimeline.js`, `src/components/Timeline.jsx`,
  `src/pages/Explore.jsx`.
- Shared UI contract changes: `src/components/TemperatureChart.jsx`,
  `src/components/TemperatureSummary.jsx`,
  `src/components/TemperatureInfo.jsx`.

---

## 6. Local commands

From `frontend/`:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

The dev server runs at `http://localhost:5173` by default.
