package org.example.service.nasa;

import org.example.dto.nasa.EnvironmentalRecordInput;

import java.util.List;

/**
 * Abstraction for a NASA data source provider.
 *
 * <p>Each provider (GISTEMP, MUR SST, OSCAR, GEOS, GEDI, ISS LIS)
 * implements this interface with source-specific parsing and validation
 * logic. Providers are lazy: no network calls in constructors.
 *
 * <p>For large datasets, providers should support pagination or streaming
 * rather than loading entire files into memory.
 */
public interface NasaDatasetProvider {

    /**
     * Returns the stable dataset identifier (e.g., "mur-sst-v4.1").
     *
     * @return dataset ID, never null
     */
    String datasetId();

    /**
     * Returns the human-readable dataset name.
     *
     * @return dataset name, never null
     */
    String datasetName();

    /**
     * Fetches NASA records for a given year.
     *
     * <p>Only records for the requested year are returned. Missing values
     * are preserved as null; never estimated or interpolated.
     *
     * @param year the year to fetch (must be >= 1880)
     * @return list of environmental record inputs, never null
     * @throws NasaDataException if the provider cannot fetch the data
     */
    List<EnvironmentalRecordInput> fetchData(int year);

    /**
     * Returns whether this provider is configured and ready to serve
     * requests. A missing API key or endpoint must return false, not
     * throw.
     *
     * @return true if available, false otherwise
     */
    boolean isAvailable();
}
