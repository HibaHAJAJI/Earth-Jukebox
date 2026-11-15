package org.example.service.nasa;

import org.example.dto.nasa.EnvironmentalRecordInput;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Normalizes provider-specific NASA records into a common
 * {@link EnvironmentalRecordInput} DTO.
 *
 * <p>Does not force incompatible formats into one generic parser. Each
 * provider's raw records are converted here with source-specific field
 * mapping. Null values are preserved; never replaced with zero.
 */
public interface NasaDataNormalizer {

    /**
     * Returns the dataset ID this normalizer handles.
     *
     * @return dataset ID, never null
     */
    String datasetId();

    /**
     * Normalizes raw provider records into a common DTO list.
     *
     * @param rawRecords provider-specific raw records (never null)
     * @return normalized records, never null
     */
    List<EnvironmentalRecordInput> normalize(List<?> rawRecords);

    /**
     * Returns the measurement unit for this dataset.
     *
     * @return unit string (e.g., "°C", "m s⁻¹", "ppm"), never null
     */
    String getUnit();
}
