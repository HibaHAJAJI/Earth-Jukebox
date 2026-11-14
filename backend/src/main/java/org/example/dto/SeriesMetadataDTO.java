package org.example.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Metadata returned with a monthly or annual series. Monthly values are
 * shaped for the existing frontend normalizer: metadata + data, with
 * unit, baseline, frequency, isMock, startYear and endYear.
 */
public record SeriesMetadataDTO(
        String phenomenonId,
        String title,
        String resolution,
        String frequency,
        String source,
        String sourceUrl,
        String unit,
        String baseline,
        String missingPolicy,
        String dataVersion,
        String retrievedAt,
        String license,
        @JsonProperty("isMock") boolean mock,
        String requestedFrom,
        String requestedTo,
        String returnedFrom,
        String returnedTo,
        Integer startYear,
        Integer endYear,
        Integer datasetStartYear,
        Integer datasetEndYear,
        int recordCount,
        int numericCount,
        int missingCount,
        String notes
) {
}
