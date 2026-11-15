package org.example.data;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.dto.AnnualTemperatureDTO;
import org.example.dto.TemperatureDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

/**
 * File-backed data access for the read-only scientific datasets.
 *
 * <p>The MVP does not require a database. The processed JSON files are loaded
 * once at startup, validated, and served from memory. The separate JPA
 * entities/repositories remain in the project for future database work.</p>
 */
@Repository
public class ResourcePhenomenonDataRepository {

    private final MonthlyDatasetFile monthlyDataset;
    private final AnnualDatasetFile annualDataset;
    private final String annualDataVersion;

    public ResourcePhenomenonDataRepository(
            ResourceLoader resourceLoader,
            ObjectMapper objectMapper,
            @Value("${app.data.monthly-resource:classpath:monthly_temperature_anomaly.json}")
            String monthlyResource,
            @Value("${app.data.annual-resource:classpath:sonification_dataset.json}")
            String annualResource
    ) {
        byte[] monthlyBytes = readBytes(resourceLoader, monthlyResource);
        byte[] annualBytes = readBytes(resourceLoader, annualResource);

        this.monthlyDataset = readJson(objectMapper, monthlyBytes, MonthlyDatasetFile.class, monthlyResource);
        this.annualDataset = readJson(objectMapper, annualBytes, AnnualDatasetFile.class, annualResource);
        this.annualDataVersion = "gistemp-v4-annual-" + sha256(annualBytes).substring(0, 12);

        validateMonthly(monthlyDataset);
        validateAnnual(annualDataset);
    }

    public MonthlyDatasetFile monthlyDataset() {
        return monthlyDataset;
    }

    public AnnualDatasetFile annualDataset() {
        return annualDataset;
    }

    public String annualDataVersion() {
        return annualDataVersion;
    }

    private static byte[] readBytes(ResourceLoader resourceLoader, String location) {
        Resource resource = resourceLoader.getResource(location);
        if (!resource.exists()) {
            throw new IllegalStateException("Dataset resource not found: " + location);
        }

        try (InputStream inputStream = resource.getInputStream()) {
            return inputStream.readAllBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read dataset resource: " + location, exception);
        }
    }

    private static <T> T readJson(
            ObjectMapper objectMapper,
            byte[] bytes,
            Class<T> type,
            String location
    ) {
        try {
            return objectMapper.readValue(bytes, type);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not parse dataset resource: " + location, exception);
        }
    }

    private static void validateMonthly(MonthlyDatasetFile dataset) {
        if (dataset == null || dataset.metadata() == null || dataset.data() == null) {
            throw new IllegalStateException("Monthly dataset must contain metadata and data.");
        }

        List<TemperatureDTO> records = dataset.data();
        if (records.isEmpty()) {
            throw new IllegalStateException("Monthly dataset contains no records.");
        }

        Set<String> seen = new HashSet<>();
        int previousYearMonth = -1;
        int missingCount = 0;

        for (TemperatureDTO record : records) {
            if (record == null || record.year() == null || record.month() == null) {
                throw new IllegalStateException("Monthly dataset contains a record without year or month.");
            }
            if (record.month() < 1 || record.month() > 12) {
                throw new IllegalStateException("Monthly dataset contains an invalid month: " + record);
            }
            if (record.year() < 1880 || record.year() > 2100) {
                throw new IllegalStateException("Monthly dataset contains an unexpected year: " + record);
            }
            if (record.anomaly() != null && !Double.isFinite(record.anomaly())) {
                throw new IllegalStateException("Monthly dataset contains a non-finite anomaly: " + record);
            }

            String key = record.year() + "-" + record.month();
            if (!seen.add(key)) {
                throw new IllegalStateException("Monthly dataset contains a duplicate month: " + key);
            }

            int yearMonth = record.year() * 100 + record.month();
            if (yearMonth < previousYearMonth) {
                throw new IllegalStateException("Monthly dataset is not sorted chronologically.");
            }
            previousYearMonth = yearMonth;

            if (record.anomaly() == null) {
                missingCount++;
            }
        }

        if (dataset.metadata().recordCount() != null
                && dataset.metadata().recordCount() != records.size()) {
            throw new IllegalStateException(
                    "Monthly metadata recordCount does not match the data size: "
                            + dataset.metadata().recordCount() + " vs " + records.size()
            );
        }
        if (dataset.metadata().missingCount() != null
                && dataset.metadata().missingCount() != missingCount) {
            throw new IllegalStateException(
                    "Monthly metadata missingCount does not match the data: "
                            + dataset.metadata().missingCount() + " vs " + missingCount
            );
        }
    }

    private static void validateAnnual(AnnualDatasetFile dataset) {
        if (dataset == null || dataset.data() == null || dataset.data().isEmpty()) {
            throw new IllegalStateException("Annual dataset contains no records.");
        }

        Set<Integer> seen = new HashSet<>();
        int previousYear = Integer.MIN_VALUE;

        for (AnnualTemperatureDTO record : dataset.data()) {
            if (record == null || record.year() == null) {
                throw new IllegalStateException("Annual dataset contains a record without a year.");
            }
            if (!seen.add(record.year())) {
                throw new IllegalStateException("Annual dataset contains a duplicate year: " + record.year());
            }
            if (record.year() < previousYear) {
                throw new IllegalStateException("Annual dataset is not sorted chronologically.");
            }
            if (record.temperature() != null && !Double.isFinite(record.temperature())) {
                throw new IllegalStateException("Annual dataset contains a non-finite temperature: " + record);
            }
            if (record.movingAverage10y() != null && !Double.isFinite(record.movingAverage10y())) {
                throw new IllegalStateException("Annual dataset contains a non-finite moving average: " + record);
            }
            if (record.trend() != null && !Double.isFinite(record.trend())) {
                throw new IllegalStateException("Annual dataset contains a non-finite trend: " + record);
            }
            previousYear = record.year();
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }
}
