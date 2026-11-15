package org.example.dto.nasa;

/**
 * Information about a NASA data source available for import.
 *
 * <p>Descriptive catalog information, not measurement data.
 */
public record NasaDatasetSourceInfo(
        String datasetId,
        String datasetName,
        boolean available
) {
}
