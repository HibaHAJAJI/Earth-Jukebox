# Implementation Plan — Earth Jukebox Multi-Source NASA Data Integration

**Project:** Earth Jukebox — NASA Space Apps Challenge 2026  
**Phase:** Phase 1 — Audit and Source Verification (Complete)  
**Next Phase:** Phase 2 — Foundation  
**Date:** 2026-11-15

This plan outlines the phased implementation approach for integrating multiple NASA Earth science data sources into Earth Jukebox. It is based on the verified NASA_SOURCE_CATALOG.md and the existing project audit.

---

## Existing Project State (Verified)

### Backend (Spring Boot 3.5.7, Java 21)
- **Package:** `org.example`
- **Active profile:** File-backed (no database). JPA auto-configuration excluded.
- **Legacy profile:** `legacy-jpa` activates MySQL + JPA entities (inactive by default)
- **Data layer:** `ResourcePhenomenonDataRepository` loads JSON from classpath at startup
- **NASA data:** GISTEMP v4 monthly temperature anomaly (1880-2026), °C, baseline 1951-1980
- **Active endpoints (5):** All GET under `/api/v1/phenomena*` and `/api/v1/meta`
- **AI layer:** `POST /api/v1/ai/explain` implemented with OpenAI provider (graceful degradation without API key)
- **CORS:** GET, OPTIONS, POST allowed for `http://localhost:5173`, `http://127.0.0.1:5173`
- **Tests:** 40 tests, all passing
- **Build:** Maven, `mvn clean test` passes

### Frontend (React + Vite)
- **Port:** 5173
- **Data:** Mock data currently (mockTemperatureData.js)
- **Integration point:** `temperatureService.js` accepts `VITE_TEMPERATURE_DATA_URL` env var
- **Components:** TemperatureChart, TemperatureInfo, TemperatureSummary, Timeline, EarthVisual, AudioControls
- **Sonification:** Web Audio API engine, pitch mapped from temperature anomaly (-2 to +2 °C → 220 to 880 Hz)

### Data Files
- `data/raw/GLB.Ts+dSST.csv` — Raw NASA GISTEMP v4 CSV
- `data/processed/monthly_temperature_anomaly.json` — Processed monthly JSON (1764 records)
- `data/processed/sonification_dataset.json` — Processed annual JSON (146 records)
- `data-pipeline/build_monthly_temperature.py` — Python script to build processed JSON from raw CSV

---

## Phase 2 — Foundation (After Approval)

### Objective
Implement shared NASA multi-source infrastructure, normalized data models, and database migrations without importing any specific source yet.

### Tasks

#### 2.1 Database Configuration
- Activate PostgreSQL profile (separate from `legacy-jpa` MySQL profile)
- Add PostgreSQL driver dependency to `pom.xml`
- Create `application-postgres.yml` with PostgreSQL datasource configuration
- Keep existing `legacy-jpa` (MySQL) profile untouched
- Default profile remains file-backed (no database required for MVP)

#### 2.2 Environmental Record Entity (JPA)
Create `org.example.model.environmental.EnvironmentalRecord`:
```java
@Entity
@Table(name = "environmental_records")
public class EnvironmentalRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String datasetName;        // e.g., "mur-sst-v4.1", "oscar-surface-currents-v2.0"
    
    @Column(nullable = false)
    private Integer year;
    
    private Integer month;             // null for annual-only datasets
    
    private String region;             // geographic region identifier
    
    private Double value;              // measurement value, null preserved
    
    @Column(nullable = false)
    private String unit;               // original NASA unit (°C, m s⁻¹, ppm, etc.)
    
    @Column(nullable = false)
    private String sourceUrl;          // official NASA source URL
    
    private LocalDateTime createdAt;   // import timestamp
    
    // Provenance metadata
    private String originalVariable;   // e.g., "analysed_sst", "u", "flash_count"
    private String productIdentifier;  // e.g., "MUR-JPL-L4-GLOB-v4.1"
    private LocalDateTime observationTimestamp;
    private Double latitude;
    private Double longitude;
    private String qualityFlag;
    private String importBatchId;      // for duplicate import detection
}
```

#### 2.3 Repository and Flyway Migration
- Create `EnvironmentalRecordRepository extends JpaRepository<EnvironmentalRecord, Long>`
- Create Flyway migration `V1__create_environmental_records.sql`
- Indexes on `(datasetName, year, month)`, `observationTimestamp`, `latitude`, `longitude`
- Keep migration compatible with existing Flyway setup (check existing migration version numbers)

#### 2.4 Shared NASA Infrastructure (No Source-Specific Code)
Create package `org.example.service.nasa`:

| Class | Responsibility |
|-------|---------------|
| `NasaDatasetProvider` (interface) | Contract: `datasetName()`, `fetchData(int year)` returning typed DTO |
| `NasaDatasetRegistry` | Registry of all providers, lookup by dataset ID |
| `NasaHttpClient` | Wrapper around `java.net.http.HttpClient` with timeout, retry, user-agent |
| `NasaImportService` | Orchestrates provider → normalizer → repository, batch import with dedup |
| `NasaDataNormalizer` | Converts provider-specific records to `EnvironmentalRecordInput` DTO |
| `NasaSourceMetadataService` | Reads `NASA_SOURCE_CATALOG.md` metadata for `/api/v1/nasa/datasets` |

#### 2.5 EnvironmentalRecordInput DTO
```java
public record EnvironmentalRecordInput(
    String datasetName,
    Integer year,
    Integer month,
    String region,
    Double value,
    String unit,
    String sourceUrl,
    String originalVariable,
    String productIdentifier,
    LocalDateTime observationTimestamp,
    Double latitude,
    Double longitude,
    String qualityFlag
) {}
```

#### 2.6 Tests
- Unit tests for `NasaDataNormalizer` (null preservation, unit validation)
- Repository integration test (save/retrieve, null preservation)
- No source-specific provider tests yet (Phase 3)

### Exit Criteria
- Application starts with PostgreSQL profile
- `EnvironmentalRecord` entity and repository functional
- Flyway migration applies cleanly
- All 40 existing tests still pass
- No source-specific code written yet

---

## Phase 3 — Source Integration (One Source at a Time)

### Objective
Integrate each verified NASA source separately. Test each source completely before proceeding to the next.

### Integration Order (by complexity)

#### 3.1 Source: `iss-lis-v3` (ISS Lightning) — Simplest
- Format: netCDF-4 / HDF-4
- Coverage: 2017-03-01 to 2023-11-16, 55°S–55°N
- Variables: lightning flash events
- Implementation:
  - `IssLisProvider implements NasaDatasetProvider`
  - Parse netCDF-4 using existing Java libraries (or add minimal dependency)
  - Store as `EnvironmentalRecord` with datasetName="iss-lis-v3", unit="flash_count" or similar
- Tests: Provider unit test with mocked netCDF, import service test

#### 3.2 Source: `oscar-surface-currents-v2.0` (Ocean Currents)
- Format: netCDF-4
- Coverage: 1993-01-01 to present, 0.25° grid
- Variables: u, ug, v, vg (m s⁻¹)
- Implementation:
  - `OscarCurrentsProvider implements NasaDatasetProvider`
  - OPeNDAP or HTTPS download
  - Store with datasetName="oscar-surface-currents-v2.0", unit="m s⁻¹"
- Tests: Provider unit test, import service test

#### 3.3 Source: `mur-sst-v4.1` (Sea Surface Temperature)
- Format: netCDF-4
- Coverage: 2002-05-31 to present, 0.01° grid
- Variables: analysed_sst (°C)
- Implementation:
  - `MurSstProvider implements NasaDatasetProvider`
  - OPeNDAP or HTTPS download
- Tests: Provider unit test, import service test

#### 3.4 Source: `gedi-forest-height` (Forest Height)
- Format: HDF5 (L2), GeoTIFF/COG (L3)
- Coverage: 2019-04-04 to present (with data gap 2023-03-17 to 2024-04-26)
- Variables: canopy height (RH100), ground elevation (meters)
- Implementation:
  - `GediForestHeightProvider implements NasaDatasetProvider`
  - CMR API discovery + Harmony subsetting or direct HDF5 download
- Tests: Provider unit test, import service test

#### 3.5 Source: `geos-cf-aerosols` (GEOS Aerosols)
- Format: NetCDF-4
- Coverage: 2018-01-01 to present (v1), 2025-08-04 to present (v2)
- Variables: aerosol species, optical depth, PM2.5
- Implementation:
  - `GeosCfAerosolsProvider implements NasaDatasetProvider`
  - OPeNDAP access
- Tests: Provider unit test, import service test

#### 3.6 Source: `geos-cf-air-quality` (Air Quality)
- Format: NetCDF-4
- Coverage: Same as GEOS-CF
- Variables: NO2, O3, SO2, CO, PM2.5, PM10
- Implementation:
  - `GeosCfAirQualityProvider implements NasaDatasetProvider`
  - OPeNDAP access, aqc collection
- Tests: Provider unit test, import service test

### Exit Criteria per Source
- Provider implemented in `org.example.service.nasa`
- Provider registered in `NasaDatasetRegistry`
- Import service successfully imports a sample year
- Unit tests pass with mocked HTTP responses
- No regression in existing 40 tests
- Source marked as "Integrated" in catalog

### Sources NOT Integrated as Numerical Data
| Source | Reason | Frontend Use |
|--------|--------|--------------|
| `perpetual-ocean-2` | Visualization only (video/frames) | Visual layer (SVS assets) |
| `atmospheric-river-visualizations` | Visualization only | Visual layer (SVS assets) |
| `dyamond-co2` | Very large model output (terabyte-scale) | SVS visualization assets only |
| `earth-information-center` | Discovery portal only | Source attribution links |

---

## Phase 4 — AI Integration

### Objective
Update `ExplanationService` to aggregate multi-source context for AI explanations.

### Tasks

#### 4.1 Extended NasaDataContext
Add fields to `NasaDataContext` for multi-source support:
- `List<NasaFact> additionalFacts` — facts from non-GISTEMP sources
- `String additionalSources` — comma-separated source names
- `String confidenceLevel` — based on data completeness, coverage, quality

#### 4.2 Updated ExplanationService
- Accept optional list of dataset IDs
- Retrieve from `NasaDatasetRegistry` for each requested source
- Build combined context preserving source attribution
- Call `OpenAiExplanationProvider` with enhanced context
- System prompt updated to include: FACTS, STATISTICS, INTERPRETATION, LIMITATIONS, DATA SOURCES, CONFIDENCE LEVEL

#### 4.3 Confidence Level Calculation
Based on:
- Data completeness (null ratio)
- Temporal coverage (years available vs. requested)
- Spatial coverage (global vs. regional)
- Source quality flags
- Model vs. observation classification

**Rule:** OpenAI never invents confidence scores. Confidence is computed by backend from data quality metrics.

### Exit Criteria
- `/api/v1/ai/explain` accepts optional `datasetIds` parameter
- Multi-source context built correctly
- All 40 existing tests still pass
- AI explanation references multiple sources when available

---

## Phase 5 — Frontend

### Objective
Connect verified backend data to the React frontend visualization layers.

### Tasks

#### 5.1 Backend API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/v1/nasa/import/{dataset}` | POST | Import a specific NASA dataset for a year |
| `GET /api/v1/environmental-data` | GET | Query environmental data (filters: year, month, dataset, region) |
| `GET /api/v1/nasa/datasets` | GET | List available datasets with metadata |

#### 5.2 Frontend Components
| Component | Purpose | Data Source |
|-----------|---------|-------------|
| Dataset selector | Choose NASA data source | `GET /api/v1/nasa/datasets` |
| Year/date selection | Select time period | Backend import + query |
| Interactive 3D Earth | Globe visualization | `EarthVisual.jsx` (extend) |
| Ocean temperature layer | SST visualization | `mur-sst-v4.1` data |
| Ocean currents layer | Current visualization | `oscar-surface-currents-v2.0` data |
| Forest height layer | GEDI canopy height | `gedi-forest-height` data |
| Lightning events | ISS LIS flash events | `iss-lis-v3` data |
| Atmospheric river visuals | SVS video frames | Source 8 (visualization only) |
| AI explanation | Multi-source explanation | `POST /api/v1/ai/explain` |
| Voice narration | TTS narration | Existing OpenAI provider (narration mode) |

#### 5.3 Scientific Integrity Rules (Frontend)
- Never display annual global temperature anomalies as local temperatures on a geographic globe
- Use spatial datasets (SST, currents, forest height) for geographic layers
- Keep timeline synchronized: visualization, selected year, sonification, AI explanation
- Label model output vs. direct observation clearly
- Label visualization assets as "visualization" not "measurement"

#### 5.4 Exit Criteria
- All 5 Phase 3 sources importable via backend API
- Frontend can select dataset, year, and view data
- AI explanation aggregates multiple sources
- All 40 existing backend tests still pass

---

## Phase 6 — Final Validation

### Objective
Validate the complete multi-source platform.

### Validation Steps

| Step | Description | Command |
|------|-------------|---------|
| 6.1 | Maven tests (all existing + new) | `mvn clean test` |
| 6.2 | Frontend tests | `cd frontend && npm test` |
| 6.3 | Database migration validation | Flyway `validate` goal |
| 6.4 | Docker Compose validation (if applicable) | `docker-compose up --build` |
| 6.5 | API endpoint tests | Manual curl/Postman against running instance |
| 6.6 | NASA source connectivity checks | Verify each provider can reach its endpoint |

### Final Report
Document:
- Which sources successfully integrated
- Which sources remain visualization-only
- Test results (pass/fail counts)
- Any limitations or known issues
- Performance characteristics (import time, query response time)

---

## Constraints and Rules (Strict)

| Rule | Description |
|------|-------------|
| No new frameworks | Do not add Kafka, Redis, Elasticsearch, LangChain, CrewAI, or multi-agent frameworks |
| No fake data | Never invent NASA API endpoints, variables, measurements, or download URLs |
| No visualization-as-measurement | Do not store images/videos as EnvironmentalRecord entries |
| No null-to-zero | Never convert missing values to zero |
| Preserve units | Always store and report original NASA units |
| Model vs. observation | Clearly distinguish model simulations (GEOS-CF, DYAMOND) from direct observations (GISTEMP, LIS, OSCAR, GEDI) |
| Credential security | No hardcoded keys; use environment variables (OPENAI_API_KEY, NASA_API_KEY, EARTHDATA_USERNAME, EARTHDATA_PASSWORD) |
| No credential logging | Never log API keys or authorization headers |
| Existing functionality preserved | Do not break `/api/v1/ai/explain` or any existing endpoint |
| Hackathon-friendly | Keep implementation lightweight and understandable |

---

## Estimated Effort

| Phase | Description | Estimated Effort |
|-------|-------------|-----------------|
| Phase 2 | Foundation (entity, repository, Flyway, shared infrastructure) | 1-2 days |
| Phase 3.1 | ISS Lightning provider | 1 day |
| Phase 3.2 | Ocean Currents provider | 1 day |
| Phase 3.3 | Sea Surface Temperature provider | 1 day |
| Phase 3.4 | GEDI Forest Height provider | 1-2 days |
| Phase 3.5 | GEOS Aerosols provider | 1-2 days |
| Phase 3.6 | GEOS Air Quality provider | 1-2 days |
| Phase 4 | AI multi-source context | 1 day |
| Phase 5 | Frontend integration | 2-3 days |
| Phase 6 | Final validation | 1 day |
| **Total** | | **~12-16 days** |

---

## STOP

Phase 1 is complete. This implementation plan and the NASA_SOURCE_CATALOG.md are ready for review. No implementation files have been created or modified beyond these two documents.

Awaiting explicit approval before proceeding to Phase 2.
