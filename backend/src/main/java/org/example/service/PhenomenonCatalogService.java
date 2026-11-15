package org.example.service;

import org.example.data.AnnualDatasetFile;
import org.example.data.MonthlyDatasetFile;
import org.example.data.MonthlyFileMetadata;
import org.example.data.ResourcePhenomenonDataRepository;
import org.example.dto.ApiMetaDTO;
import org.example.dto.DatasetCoverageDTO;
import org.example.dto.PhenomenonDTO;
import org.example.dto.PhenomenonListResponse;
import org.example.exception.PhenomenonNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class PhenomenonCatalogService {

    public static final String TEMPERATURE_PHENOMENON_ID = "global-temperature-anomaly";
    public static final String API_VERSION = "v1";
    public static final String BACKEND_VERSION = "1.0.0";
    public static final String SOURCE_URL = "https://data.giss.nasa.gov/gistemp/data_v4.html";

    private final ResourcePhenomenonDataRepository repository;

    public PhenomenonCatalogService(ResourcePhenomenonDataRepository repository) {
        this.repository = repository;
    }

    public PhenomenonListResponse listPhenomena() {
        PhenomenonDTO phenomenon = temperaturePhenomenon();
        return new PhenomenonListResponse(List.of(phenomenon), 1);
    }

    public PhenomenonDTO getPhenomenon(String id) {
        requirePhenomenon(id);
        return temperaturePhenomenon();
    }

    public void requirePhenomenon(String id) {
        if (!TEMPERATURE_PHENOMENON_ID.equalsIgnoreCase(id)) {
            throw new PhenomenonNotFoundException(id);
        }
    }

    public PhenomenonDTO temperaturePhenomenon() {
        MonthlyDatasetFile monthly = repository.monthlyDataset();
        MonthlyFileMetadata metadata = monthly.metadata();
        AnnualDatasetFile annual = repository.annualDataset();

        DatasetCoverageDTO monthlyCoverage = new DatasetCoverageDTO(
                "monthly",
                monthly.data().size(),
                countMonthlyValues(monthly),
                metadata.missingCount() == null ? 0 : metadata.missingCount(),
                metadata.startMonth(),
                metadata.endMonth()
        );

        int annualNumericCount = (int) annual.data().stream()
                .filter(record -> record.temperature() != null)
                .count();
        int annualMissingCount = annual.data().size() - annualNumericCount;
        int firstAnnualYear = annual.data().getFirst().year();
        int lastAnnualYear = annual.data().getLast().year();

        DatasetCoverageDTO annualCoverage = new DatasetCoverageDTO(
                "annual",
                annual.data().size(),
                annualNumericCount,
                annualMissingCount,
                String.valueOf(firstAnnualYear),
                String.valueOf(lastAnnualYear)
        );

        return new PhenomenonDTO(
                TEMPERATURE_PHENOMENON_ID,
                "Global Surface Temperature Anomaly",
                "Monthly and annual global land-ocean surface temperature anomalies "
                        + "relative to the 1951-1980 baseline. Monthly values come from the "
                        + "NASA GISS GISTEMP v4 source file; annual values are the existing "
                        + "processed 1880-2025 series.",
                metadata.source(),
                metadata.sourceUrl(),
                metadata.unit(),
                metadata.baseline(),
                "available",
                List.of("monthly", "annual"),
                monthlyCoverage,
                annualCoverage,
                metadata.dataVersion(),
                Boolean.TRUE.equals(metadata.isMock()),
                metadata.retrievedAt(),
                metadata.license()
        );
    }

    public ApiMetaDTO getMeta() {
        PhenomenonDTO phenomenon = temperaturePhenomenon();
        Instant now = Instant.now();

        return new ApiMetaDTO(
                "Earth Jukebox",
                API_VERSION,
                BACKEND_VERSION,
                now.toString(),
                "/swagger-ui.html",
                List.of(
                        new ApiMetaDTO.DatasetMeta(
                                phenomenon.id(),
                                phenomenon.monthly().frequency(),
                                phenomenon.source(),
                                phenomenon.unit(),
                                phenomenon.baseline(),
                                phenomenon.monthly().from() + " to " + phenomenon.monthly().to(),
                                phenomenon.monthly().recordCount(),
                                phenomenon.monthly().missingCount(),
                                phenomenon.dataVersion(),
                                phenomenon.mock()
                        ),
                        new ApiMetaDTO.DatasetMeta(
                                phenomenon.id(),
                                phenomenon.annual().frequency(),
                                phenomenon.source(),
                                phenomenon.unit(),
                                phenomenon.baseline(),
                                phenomenon.annual().from() + " to " + phenomenon.annual().to(),
                                phenomenon.annual().recordCount(),
                                phenomenon.annual().missingCount(),
                                repository.annualDataVersion(),
                                phenomenon.mock()
                        )
                ),
                List.of(
                        new ApiMetaDTO.EndpointInfo("GET", "/api/v1/phenomena", "List available phenomena"),
                        new ApiMetaDTO.EndpointInfo("GET", "/api/v1/phenomena/{id}", "Phenomenon detail and coverage"),
                        new ApiMetaDTO.EndpointInfo("GET", "/api/v1/phenomena/{id}/series", "Monthly or annual series"),
                        new ApiMetaDTO.EndpointInfo("GET", "/api/v1/phenomena/{id}/sonification-map", "Sonification mapping contract"),
                        new ApiMetaDTO.EndpointInfo("GET", "/api/v1/meta", "API and dataset metadata")
                ),
                new ApiMetaDTO.DataPolicy(
                        "Missing monthly values are preserved as JSON null and are never replaced with zero.",
                        "Annual values are served from the existing processed dataset, "
                                + "which contains complete annual records only. The 2026 partial "
                                + "year is not included in annual data.",
                        "Monthly values are parsed from data/raw/GLB.Ts+dSST.csv and written to a separate monthly dataset.",
                        "File-backed read-only datasets. No database is required for the MVP.",
                        "The backend serves a mapping specification only; audio synthesis belongs to the frontend Web Audio engine."
                )
        );
    }

    private static int countMonthlyValues(MonthlyDatasetFile monthly) {
        return (int) monthly.data().stream()
                .filter(record -> record.anomaly() != null)
                .count();
    }
}
