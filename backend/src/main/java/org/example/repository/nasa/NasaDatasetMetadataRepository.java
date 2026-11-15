package org.example.repository.nasa;

import org.example.model.nasa.NasaDatasetMetadata;

import java.util.List;

/**
 * Repository for NASA dataset metadata (catalog information).
 */
public interface NasaDatasetMetadataRepository {

    NasaDatasetMetadata findByDatasetId(String datasetId);

    List<NasaDatasetMetadata> findByStatus(String status);
}
