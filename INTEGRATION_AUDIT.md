# Earth Jukebox — Integration Audit Report

**Date:** 2026-11-15  
**Auditor:** Senior Full-Stack Architect  
**Status:** Complete — ready for implementation

---

## 1. Existing Frontend Features

| Feature | Files | Status | Notes |
|---------|-------|--------|-------|
| Home page with climate visual | `frontend/src/pages/Home.jsx` | Working | Mock data, sonification, warming stripes |
| Explore page with chart + timeline | `frontend/src/pages/Explore.jsx` | Working | Mock data, real-time timeline scrubbing |
| About page | `frontend/src/pages/About.jsx` | Working | Static content |
| NotFound page | `frontend/src/pages/NotFound.jsx` | Working | Static content |
| Navbar | `frontend/src/components/Navbar.jsx` | Working | Navigation links |
| Footer | `frontend/src/components/Footer.jsx` | Working | Links and credits |
| EarthVisual | `frontend/src/components/EarthVisual.jsx` | Working | CSS-only artwork |
| TemperatureChart | `frontend/src/components/TemperatureChart.jsx` | Working | Recharts area chart |
| TemperatureInfo | `frontend/src/components/TemperatureInfo.jsx` | Working | Scientific context |
| TemperatureSummary | `frontend/src/components/TemperatureSummary.jsx` | Working | Selected month summary |
| Timeline | `frontend/src/components/Timeline.jsx` | Working | Year/month selectors, playback |
| AudioControls | `frontend/src/components/AudioControls.jsx` | Working | Web Audio API sonification |
| ClimateVisual (home) | `frontend/src/components/home/ClimateVisual.jsx` | Working | Original CSS/SVG art |
| CelestialVisual (home) | `frontend/src/components/home/CelestialVisual.jsx` | Working | Original CSS/SVG art |
| WarmingStripes (home) | `frontend/src/components/home/WarmingStripes.jsx` | Working | Annual anomaly stripes |

**Mock data usage:** `frontend/src/data/mockTemperatureData.js` — all frontend pages currently use synthetic placeholder data, not real NASA measurements.

---

## 2. Existing Backend Endpoints

| Endpoint | Method | Profile | Status | Returns |
|----------|--------|---------|--------|---------|
| `/api/v1/phenomena` | GET | default | Working | List of phenomena (1: GISTEMP v4) |
| `/api/v1/phenomena/{id}` | GET | default | Working | Phenomenon detail + coverage |
| `/api/v1/phenomena/{id}/series` | GET | default | Working | Monthly/annual series with range filter |
| `/api/v1/phenomena/{id}/sonification-map` | GET | default | Working | Sonification mapping contract |
| `/api/v1/meta` | GET | default | Working | API metadata + dataset info |
| `POST /api/v1/ai/explain` | POST | default | Working | AI explanation (requires OpenAI key) |
| `POST /api/v1/nasa/import/{dataset}` | POST | postgres | Profile-gated | Import NASA dataset |
| `GET /api/v1/nasa/datasets` | GET | postgres | Profile-gated | Dataset catalog metadata |
| `GET /api/v1/environmental-data` | GET | postgres | Profile-gated | Query imported environmental data |
| Legacy `/api/datasets*`, `/api/temperatures*` | GET/POST | legacy-jpa | Profile-gated | JPA-backed (inactive) |

**Default profile** is file-backed (JSON), no database required.  
**`legacy-jpa`** profile activates MySQL + JPA entities.  
**`postgres`** profile activates PostgreSQL + JPA entities + Flyway.

---

## 3. Components Using Mock Data

| Component | File | Mock Source | Notes |
|-----------|------|-------------|-------|
| Home page | `frontend/src/pages/Home.jsx` | `useTemperatureData()` → `mockTemperatureData.js` | Full page uses mock data |
| Explore page | `frontend/src/pages/Explore.jsx` | `useTemperatureData()` → `mockTemperatureData.js` | Full page uses mock data |
| All chart/timeline/audio components | Via `useTemperatureData()` hook | `mockTemperatureData.js` | All receive mock data via props |

**Data integration point:** `frontend/src/services/temperatureService.js` — has `fetchTemperatureDataset()` which reads `VITE_TEMPERATURE_DATA_URL` env var. If not set, falls back to mock data.

---

## 4. Missing API Connections

| Frontend Need | Backend Endpoint | Status |
|---------------|----------------|--------|
| Real temperature data | `GET /api/v1/phenomena/{id}/series` | **NOT CONNECTED** — frontend uses mock |
| Real sonification mapping | `GET /api/v1/phenomena/{id}/sonification-map` | **NOT CONNECTED** — frontend has own hardcoded mapping |
| API metadata | `GET /api/v1/meta` | **NOT CONNECTED** — frontend has own DEFAULT_METADATA |
| AI explanations | `POST /api/v1/ai/explain` | **NOT IMPLEMENTED** — no Chat AI component in frontend |
| NASA dataset catalog | `GET /api/v1/nasa/datasets` | **NOT AVAILABLE** — behind `@Profile("postgres")` |
| Environmental data | `GET /api/v1/environmental-data` | **NOT AVAILABLE** — behind `@Profile("postgres")` |

---

## 5. CORS Issues

`CorsConfig.java` allows:
- Origins: `http://localhost:5173`, `http://127.0.0.1:5173`
- Methods: `GET`, `OPTIONS`, `POST`
- Headers: `*`
- Max age: 3600 seconds

**Verdict:** CORS is properly configured for frontend-backend communication on localhost:5173. No changes needed.

---

## 6. Data Flow Problems

1. **No API service layer:** Frontend components call `temperatureService.fetchTemperatureDataset()` which reads `VITE_TEMPERATURE_DATA_URL`. When unset, it uses mock data. There is no centralized API client for backend communication.

2. **No Chat AI:** The `POST /api/v1/ai/explain` endpoint exists on the backend but there is no frontend component to call it. The "AI Explainer" feature is missing from the UI entirely.

3. **Mock data everywhere:** All frontend pages use `mockTemperatureData.js` instead of real NASA data from the backend.

4. **Duplicate sonification mapping:** The backend `SonificationMapService` and frontend `sonificationService.js` both define the same pitch mapping independently. They should be consistent but aren't connected.

5. **Dataset metadata not fetched:** The frontend has its own `DEFAULT_METADATA` object instead of fetching from `GET /api/v1/meta`.

---

## 7. Files That Need Modification

### Backend (no changes needed for MVP integration)
- All existing backend endpoints are functional for the default profile.
- `NasaImportServiceTest.java` — has 3 compilation errors (repository interfaces lack `save()` methods). Needs fix.

### Frontend (new files and modifications)
**New files:**
- `frontend/src/services/api.js` — Centralized API client
- `frontend/src/components/ChatAI.jsx` — Chat AI component connected to `/api/v1/ai/explain`
- `frontend/src/components/DatasetSelector.jsx` — Dataset selector (for when postgres profile is active)

**Modified files:**
- `frontend/src/services/temperatureService.js` — Add backend API fetch option
- `frontend/src/hooks/useTemperatureData.js` — Wire to API service
- `frontend/src/pages/Explore.jsx` — Already uses `useTemperatureData`, will automatically get real data
- `frontend/src/pages/Home.jsx` — Already uses `useTemperatureData`, will automatically get real data
- `frontend/.env.example` — Add `VITE_API_BASE_URL` documentation

---

## 8. Proposed Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (port 5173)               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Explore.jsx │  │ ChatAI.jsx   │  │ DatasetSelector   │   │
│  │ (uses API)  │  │ (POST /ai/…) │  │ (GET /nasa/…)   │   │
│  └──────┬──────┘  └──────┬───────┘  └─────────────────┘   │
│         │               │                 │               │
│         └───────────────┴─────────────────┘               │
│                      │                                     │
│              ┌───────▼─────────┐                           │
│              │   apiService.js │  (axios/fetch wrapper)    │   │
│              │  VITE_API_BASE_URL│                          │   │
│              └───────┬─────────┘                           │
│                      │                                     │
│              ┌───────▼─────────┐                           │
│              │   Spring Boot   │  (port 8080)             │   │
│              │   /api/v1/…     │                           │   │
│              └─────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Remaining Limitations

1. **No PostgreSQL database:** The `/api/v1/nasa/*` endpoints require the `postgres` profile and a running PostgreSQL instance. They are not available in the default file-backed profile.

2. **No OpenAI API key:** The `/api/v1/ai/explain` endpoint works structurally but returns a "provider not configured" error unless `OPENAI_API_KEY` is set.

3. **Mock data still present:** The mock data will remain until `VITE_TEMPERATURE_DATA_URL` is configured to point to the backend API.

---

## Implementation Plan

1. **Fix backend test compilation** — Add `save()` methods to repository interfaces
2. **Create frontend API service** — `src/services/api.js` with base URL config
3. **Connect temperature service to backend** — Update `temperatureService.js` to fetch from backend
4. **Create Chat AI component** — `src/components/ChatAI.jsx` connected to `POST /api/v1/ai/explain`
5. **Add Chat AI to Explore page** — Integrate into existing layout
6. **Run all tests** — Backend Maven + Frontend node tests
7. **End-to-end verification** — Start both servers, verify data flow

---
