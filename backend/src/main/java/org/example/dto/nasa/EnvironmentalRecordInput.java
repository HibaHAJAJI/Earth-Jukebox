package org.example.dto.nasa;

import java.time.LocalDateTime;

/**
 * Input DTO for a single environmental measurement record.
 *
 * <p>Used to transfer normalized NASA data from providers/normalizers to
 * the import service and repositories. Null values are preserved;
 * never replaced with zero.
 */
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
) {
}
