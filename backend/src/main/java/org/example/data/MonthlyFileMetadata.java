package org.example.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Metadata stored alongside the monthly observations.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MonthlyFileMetadata(
        String id,
        String title,
        String source,
        String sourceUrl,
        String sourceDataUrl,
        String unit,
        String baseline,
        String frequency,
        Integer startYear,
        Integer endYear,
        String startMonth,
        String endMonth,
        Integer recordCount,
        Integer numericCount,
        Integer missingCount,
        String missingPolicy,
        List<String> missingMonths,
        Boolean isMock,
        String retrievedAt,
        String rawFile,
        String rawSha256,
        String dataVersion,
        String license,
        String notes
) {
}
