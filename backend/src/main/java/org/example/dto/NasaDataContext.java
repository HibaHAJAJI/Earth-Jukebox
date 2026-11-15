package org.example.dto;

import java.util.List;

/**
 * Compact context object sent to the LLM for NASA data explanation generation.
 *
 * <p>Contains only the requested NASA data subset. Never contains entire datasets.
 * Missing values remain {@code null}; never replaced with zero.
 * Retrieved NASA facts are kept separate from calculated statistics.
 */
public record NasaDataContext(

        // A. Dataset metadata (Rule 11)
        String datasetSource,
        String yearsUsed,
        String unit,
        String dataLimitations,

        // B. Retrieved NASA facts (Rule 10)
        List<NasaFact> retrievedFacts,

        // C. Calculated statistics (Rule 10)
        CalculatedStatistics calculatedStatistics,

        // D. Sonification context
        SonificationContext sonificationContext,

        // E. Missing-data handling (Rule 12)
        boolean hasMissingData,
        String missingDataDescription,

        // E2. Detailed missing data report per field
        MissingDataReport missingDataReport
) {

    /**
     * A single retrieved NASA observation. Values are preserved exactly as stored;
     * {@code null} values are never replaced.
     * <p>A fact with {@code month == null} represents an annual record.
     * A fact with {@code month != null} represents a monthly record.
     */
    public record NasaFact(
            Integer year,
            Integer month,
            Double anomaly,
            Double movingAverage,
            Double trend
    ) {
    }

    /**
     * Statistics derived from the retrieved data, not raw NASA observations.
     * All fields may be {@code null} when insufficient data exists for calculation.
     * <p>{@code firstToLastChange} compares the first and last non-null anomaly
     * values only. It is NOT a statistically established trend and must not be
     * presented as such.
     */
    public record CalculatedStatistics(
            Double averageAnomaly,
            Double minAnomaly,
            Double maxAnomaly,
            String firstToLastChange,
            String calculationDescription
    ) {
    }

    /**
     * Sonification mapping context for the requested data.
     */
    public record SonificationContext(
            String mappingId,
            String description,
            String missingValueBehavior
    ) {
    }

    /**
     * Report of which fields contain null values across retrieved facts.
     * Distinguishes records that exist but have null fields from records
     * that are entirely absent from the dataset.
     */
    public record MissingDataReport(
            int totalRecords,
            int recordsWithNullAnomaly,
            int recordsWithNullMovingAverage,
            int recordsWithNullTrend,
            List<String> missingFieldDescriptions
    ) {
    }
}
