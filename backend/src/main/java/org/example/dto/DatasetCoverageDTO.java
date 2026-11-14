package org.example.dto;

/**
 * Public metadata for one dataset resolution.
 */
public record DatasetCoverageDTO(
        String frequency,
        int recordCount,
        int numericCount,
        int missingCount,
        String from,
        String to
) {
}
