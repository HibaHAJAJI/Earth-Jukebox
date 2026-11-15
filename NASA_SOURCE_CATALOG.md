# NASA Source Catalog — Earth Jukebox Multi-Source Data Integration

**Project:** Earth Jukebox — NASA Space Apps Challenge 2026  
**Phase:** Phase 1 — Audit and Source Verification  
**Status:** Verified against official NASA documentation  
**Date:** 2026-11-15

This catalog documents all NASA Earth science data sources considered for integration. Each source was researched against official NASA documentation. Not all sources expose a programmatic API suitable for direct integration; some are visualization-only or require Earthdata Login authentication.

---

## Source 1 — NASA Earth Information Center

| Field | Value |
|-------|-------|
| Dataset ID | `earth-information-center` |
| NASA Source | NASA Earth Information Center |
| Official Documentation | https://earth.gov/ |
| API Endpoint | https://earth.gov/data-catalog (discovery catalog, not a numerical data API) |
| Download Endpoint | N/A (links to external dataset pages) |
| Authentication | None required for browsing |
| Data Format | HTML catalog pages, links to external sources |
| Variables | N/A (discovery portal only) |
| Units | N/A |
| Temporal Coverage | N/A |
| Spatial Coverage | Global / United States |
| Integration Type | Metadata discovery |
| Status | **Restricted** — Discovery portal only, not a numerical dataset API. Use for linking to official dataset pages, not for importing measurements. |

**Notes:** Earth.gov is a curated data catalog and information portal. It is not an independent numerical dataset API. It provides links to datasets hosted elsewhere (NASA DAACs, other agencies). Suitable for source attribution and discovery, not for data retrieval.

---

## Source 2 — Global Sea Surface Temperature and Ocean Currents

### 2a. Sea Surface Temperature — MUR (PO.DAAC / JPL)

| Field | Value |
|-------|-------|
| Dataset ID | `mur-sst-v4.1` |
| NASA Source | PO.DAAC / JPL / NASA |
| Official Documentation | https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1 |
| API Endpoint | CMR: https://cmr.earthdata.nasa.gov/search/granules?p=C1996881146-POCLOUD |
| Download Endpoint | HTTPS via PO.DAAC, S3 (us-west-2, Earthdata Login for protected buckets), OPeNDAP: https://opendap.earthdata.nasa.gov |
| Authentication | Earthdata Login required for protected S3 buckets; public HTTPS browse available |
| Data Format | netCDF-4 |
| Variables | Sea surface temperature (analysed_sst), uncertainty, mask |
| Units | °C (sea surface temperature), K (in some files) |
| Temporal Coverage | 2002-05-31 to Present (daily, 4-day latency retrospective, 1-day latency NRT) |
| Spatial Coverage | Global ocean, 0.01° × 0.01° grid |
| Integration Type | API / File download |
| Status | **Verified** — Active collection, HTTPS + OPeNDAP access available |

### 2b. Ocean Surface Currents — OSCAR (PO.DAAC / JPL)

| Field | Value |
|-------|-------|
| Dataset ID | `oscar-surface-currents-v2.0` |
| NASA Source | PO.DAAC / JPL / NASA |
| Official Documentation | https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_FINAL_V2.0 |
| API Endpoint | CMR: https://cmr.earthdata.nasa.gov/search/granules?p=C2098858642-POCLOUD |
| Download Endpoint | HTTPS via PO.DAAC, OPeNDAP: https://opendap.earthdata.nasa.gov, S3 (us-west-2) |
| Authentication | Earthdata Login for protected S3; public HTTPS/OPeNDAP available |
| Data Format | netCDF-4 |
| Variables | u (zonal total surface current), ug (zonal geostrophic), v (meridional total), vg (meridional geostrophic) |
| Units | m s⁻¹ |
| Temporal Coverage | 1993-01-01 to 2026-01-17 (daily, ~weekly averaging) |
| Spatial Coverage | Global ocean, 0.25° × 0.25° grid |
| Integration Type | API / File download |
| Status | **Verified** — Active collection, HTTPS + OPeNDAP access available |

**Notes:** Both PO.DAAC datasets support the `podaac-data-subscriber` Python tool for bulk download. Harmony subsetting service is available for spatial/temporal subsetting. Earthdata Login required for some access paths.

---

## Source 3 — GEOS Aerosols (GEOS-CF / GEOS-FP)

| Field | Value |
|-------|-------|
| Dataset ID | `geos-cf-aerosols` |
| NASA Source | GMAO / GSFC / NASA |
| Official Documentation | https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/ |
| API Endpoint | OPeNDAP: https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/ ; CFAPI: https://fluid.nccs.nasa.gov/cf/api/ |
| Download Endpoint | NCCS Data Portal: https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/ ; Amazon S3 Zarr: s3://smce-geos-cf-public/ |
| Authentication | Public for NCCS/OPeNDAP; CFAPI requires contact (geos-cf@lists.nasa.gov) |
| Data Format | NetCDF-4 (HDF-5 underlying), Zarr |
| Variables | Aerosol species: black carbon, organic carbon, dust, sea salt, sulfate; aerosol optical depth; PM2.5 (GEOS-CF aqc collection) |
| Units | kg m⁻² (column mass), 1 (optical depth), µg m⁻³ (PM2.5 surface) |
| Temporal Coverage | GEOS-CF v1: 2018-01-01 to 2026-01-01; GEOS-CF v2: 2025-08-04 to Present; Forecasts: ~14 days retention |
| Spatial Coverage | Global, 0.3125° longitude × 0.25° latitude (output grid); C720 (~12.5 km) native model grid |
| Integration Type | API / File download |
| Status | **Verified** — Active collection, OPeNDAP + NCCS HTTPS access available |

**Notes:** GEOS-CF is a model output system (analysis + 5-day forecast), not direct satellite observation. The `aqc` collection includes air quality relevant aerosols. Forecasts retained ~14 days except aqc collection.

---

## Source 4 — Air Quality Model Runs

| Field | Value |
|-------|-------|
| Dataset ID | `geos-cf-air-quality` |
| NASA Source | GMAO / GSFC / NASA (GEOS-CF) |
| Official Documentation | https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/faq_geos-cf |
| API Endpoint | OPeNDAP: https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/ ; CFAPI: https://fluid.nccs.nasa.gov/cf/api/ |
| Download Endpoint | NCCS Data Portal: https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/ |
| Authentication | Public for NCCS/OPeNDAP |
| Data Format | NetCDF-4 |
| Variables | Near-surface NO2, O3, SO2, CO, PM2.5, PM10 concentrations (aqc collection) |
| Units | µg m⁻³ or molecules cm⁻² (column) depending on variable |
| Temporal Coverage | GEOS-CF v1: 2018-01-01 to 2026-01-01; GEOS-CF v2: 2025-08-04 to Present |
| Spatial Coverage | Global, 0.3125° × 0.25° output grid |
| Integration Type | API / File download |
| Status | **Verified** — Active collection (aqc), OPeNDAP + NCCS HTTPS access available |

**Notes:** GEOS-CF is a research model product, not suitable for regulatory compliance assessment. Forecasts available ~17:00 UTC daily, 5-day forecast horizon. Aqc collection forecasts retained beyond 14 days.

---

## Source 5 — Perpetual Ocean 2

| Field | Value |
|-------|-------|
| Dataset ID | `perpetual-ocean-2` |
| NASA Source | NASA SVS / GSFC / NASA |
| Official Documentation | https://svs.gsfc.nasa.gov/5505 |
| API Endpoint | https://svs.gsfc.nasa.gov/api/5505 (metadata API only) |
| Download Endpoint | https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005505/ (frames, movies) |
| Authentication | None required |
| Data Format | MP4 video, PNG image frames, JPEG thumbnails |
| Variables | N/A (visualization only) |
| Units | N/A |
| Temporal Coverage | Model years 2021-2023 (ECCO-2 output) |
| Spatial Coverage | Global ocean |
| Integration Type | Visualization only |
| Status | **Restricted** — Visualization assets only (video frames, movies). No numerical dataset API. Do not convert visualization frames into fake numerical EnvironmentalRecord entries. |

**Notes:** Perpetual Ocean 2 is a Scientific Visualization Studio product based on ECCO-2 ocean model output. It provides videos and image frames for visualization, not gridded numerical data suitable for import as measurements. Use as visual layer only, with clear attribution that it is a visualization, not measurement data.

---

## Source 6 — DYAMOND Global Carbon Dioxide

| Field | Value |
|-------|-------|
| Dataset ID | `dyamond-co2` |
| NASA Source | GMAO / GSFC / NASA (via SVS) |
| Official Documentation | https://gmao.gsfc.nasa.gov/gmao-products/dyamond-phase-ii/data-access_dyamond-phase-ii/ |
| API Endpoint | NCCS Data Portal: https://portal.nccs.nasa.gov/datashare/G5NR/DYAMONDv2/ |
| Download Endpoint | NCCS access at Discover: /css/g5nr/DYAMONDv2/01KM/ and /css/g5nr/DYAMONDv2/03KM/ |
| Authentication | Public for NCCS portal |
| Data Format | NetCDF (model output files) |
| Variables | CO2 concentration (ppm), atmospheric tracers, meteorological fields |
| Units | ppm (CO2 concentration) |
| Temporal Coverage | January-March 2020 (visualization); model run period varies by configuration |
| Spatial Coverage | Global, 1.5 km and 3 km resolutions |
| Integration Type | File download (large model output) |
| Status | **Restricted** — Model output available via NCCS portal but very large file sizes. Simulation data, not direct atmospheric observation. Requires significant storage and download bandwidth. |

**Notes:** DYAMOND is an experimental coupled GEOS-MITgcm model run on NASA Advanced Supercomputing facility. SVS visualizations (IDs 5196, 5333, 5436) show CO2 for January-March 2020. Full model output is very large (terabyte-scale). Recommend using SVS visualization assets only, or limited NCCS subset download if required.

---

## Source 7 — Lightning Events Detected from the ISS (LIS)

| Field | Value |
|-------|-------|
| Dataset ID | `iss-lis-v3` |
| NASA Source | GHRC DAAC / MSFC / NASA |
| Official Documentation | https://www.earthdata.nasa.gov/data/catalog/ghrc-daac-isslis-v3-fin-3 |
| API Endpoint | CMR: https://cmr.earthdata.nasa.gov/search/concepts/C3838944284-GHRC_DAAC |
| Download Endpoint | GHRC DAAC: https://ghrc.earthdata.nasa.gov/browseui//isslis_v3_fin__3/ |
| Authentication | Public (openly shared, no restriction per EOSDIS guidance) |
| Data Format | netCDF-4, HDF-4 |
| Variables | Lightning flash events, groups, areas; flash coordinates, radiant energy, detection efficiency |
| Units | Flash count, radiant energy (J), coordinates (lat/lon), timestamps |
| Temporal Coverage | 2017-03-01 to 2023-11-16 |
| Spatial Coverage | Latitudes 55°S to 55°N, global longitude (ISS orbit coverage) |
| Integration Type | File download |
| Status | **Verified** — Active collection, 72,828 granules, publicly available |

**Notes:** ISS LIS is a space-based lightning detection instrument. Data available in HDF-4 and netCDF-4 formats. Processing Level 2 (science data). Temporal coverage ends November 2023 (mission ended). Requires parsing HDF/netCDF files.

---

## Source 8 — Atmospheric River Visualizations

| Field | Value |
|-------|-------|
| Dataset ID | `atmospheric-river-visualizations` |
| NASA Source | NASA SVS / GSFC / NASA |
| Official Documentation | https://svs.gsfc.nasa.gov/4960 ; https://www.earthdata.nasa.gov/topics/atmospheric-rivers |
| API Endpoint | https://svs.gsfc.nasa.gov/api/search?keywords=atmospheric+river (metadata API only) |
| Download Endpoint | https://svs.gsfc.nasa.gov/vis/ (frames, movies) |
| Authentication | None required |
| Data Format | MP4 video, PNG image frames |
| Variables | N/A (visualization only) |
| Units | N/A |
| Temporal Coverage | Various events (e.g., 2017-02 California, 2021-01 Pacific NW) |
| Spatial Coverage | Pacific Ocean, North American West Coast, global |
| Integration Type | Visualization only |
| Status | **Restricted** — Visualization assets only (video, frames). Based on MERRA-2 reanalysis / GEOS model output. No numerical dataset API. Do not convert visualization frames into fake numerical EnvironmentalRecord entries. |

**Notes:** Atmospheric river visualizations are SVS products based on MERRA-2 reanalysis and GEOS model output. They show water vapor transport and precipitation. Use as visual layer only, not as measurement data.

---

## Source 9 — GEDI Forest Height

| Field | Value |
|-------|-------|
| Dataset ID | `gedi-forest-height` |
| NASA Source | LP DAAC / ORNL DAAC / NASA |
| Official Documentation | https://www.earthdata.nasa.gov/data/instruments/gedi-lidar/data-access-tools |
| API Endpoint | CMR: https://cmr.earthdata.nasa.gov/ ; Harmony: https://harmony.earthdata.nasa.gov/ |
| Download Endpoint | LP DAAC (L1/L2): https://lpdaac.usgs.gov/ ; ORNL DAAC (L3/L4): https://daac.ornl.gov/ |
| Authentication | Public |
| Data Format | HDF5 (L1/L2), GeoTIFF/COG (L3/L4 derived), binary (L3 v1) |
| Variables | Canopy height (RH100, RH98, RH90, RH75, RH50), ground elevation, canopy cover, Plant Area Index, waveform metrics |
| Units | Meters (height/elevation), dimensionless (cover fraction, PAI) |
| Temporal Coverage | L2A/L2B: 2019-04-04 to 2023-03-16, 2024-04-26 to Present; L3: 2019-04-18 to 2023-03-22 |
| Spatial Coverage | Global land between 51.6°S and 51.6°N (ISS orbit); L3 gridded: 1 km × 1 km cells within -52° to 52° latitude |
| Integration Type | API / File download |
| Status | **Verified** — Active collection, CMR + Harmony APIs available |

**Notes:** GEDI instrument was removed from ISS on 2023-03-17 and reinstated 2024-04-26 (data gap during hibernation). L2A/L2B are footprint-level (~25 m resolution). L3 is gridded 1 km × 1 km. GEDI L3 gridded products provide mean canopy height per 1 km cell — suitable for forest height visualization layer.

---

## Summary Table

| # | Dataset ID | Source | Integration Type | Status | Verified Endpoint |
|---|-----------|--------|-----------------|--------|-------------------|
| 1 | `earth-information-center` | Earth.gov | Metadata discovery | Restricted | https://earth.gov/data-catalog |
| 2a | `mur-sst-v4.1` | PO.DAAC / JPL | API / File | Verified | https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1 |
| 2b | `oscar-surface-currents-v2.0` | PO.DAAC / JPL | API / File | Verified | https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_FINAL_V2.0 |
| 3 | `geos-cf-aerosols` | GMAO / GSFC | API / File | Verified | https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/ |
| 4 | `geos-cf-air-quality` | GMAO / GSFC | API / File | Verified | https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/ |
| 5 | `perpetual-ocean-2` | NASA SVS | Visualization | Restricted | https://svs.gsfc.nasa.gov/5505 |
| 6 | `dyamond-co2` | GMAO / GSFC | File download | Restricted | https://gmao.gsfc.nasa.gov/gmao-products/dyamond-phase-ii/ |
| 7 | `iss-lis-v3` | GHRC DAAC | File download | Verified | https://www.earthdata.nasa.gov/data/catalog/ghrc-daac-isslis-v3-fin-3 |
| 8 | `atmospheric-river-visualizations` | NASA SVS | Visualization | Restricted | https://svs.gsfc.nasa.gov/4960 |
| 9 | `gedi-forest-height` | LP DAAC / ORNL | API / File | Verified | https://www.earthdata.nasa.gov/data/instruments/gedi-lidar |

**Verified sources with API/file access:** 2a, 2b, 3, 4, 7, 9 (6 sources)  
**Visualization-only sources:** 5, 8 (2 sources)  
**Large model output (restricted):** 6 (1 source)  
**Discovery portal only:** 1 (1 source)

---

## Integration Recommendations

**Phase 2 candidates (immediate, verified API access):**
- `oscar-surface-currents-v2.0` — Ocean currents, netCDF-4, OPeNDAP available
- `mur-sst-v4.1` — Sea surface temperature, netCDF-4, OPeNDAP available
- `iss-lis-v3` — Lightning events, netCDF-4/HDF-4, public download
- `gedi-forest-height` — Forest height, HDF5/GeoTIFF, CMR + Harmony APIs

**Phase 3 candidates (larger files, more complex):**
- `geos-cf-aerosols` — Aerosols, NetCDF-4, OPeNDAP + NCCS
- `geos-cf-air-quality` — Air quality, NetCDF-4, OPeNDAP + NCCS

**Visualization-only (frontend layer, no backend import):**
- `perpetual-ocean-2` — Ocean current visualization
- `atmospheric-river-visualizations` — Atmospheric river visualization
- `dyamond-co2` — CO2 visualization (large model output, SVS assets only)

**Discovery/linking only:**
- `earth-information-center` — Source attribution links

---
