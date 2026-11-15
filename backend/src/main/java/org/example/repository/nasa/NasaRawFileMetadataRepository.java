package org.example.repository.nasa;

import org.example.model.nasa.NasaRawFileMetadata;

import java.util.List;
import java.util.Optional;

/**
 * Repository for raw NASA file metadata.
 */
public interface NasaRawFileMetadataRepository {

    List<NasaRawFileMetadata> findByDatasetId(String datasetId);

    Optional<NasaRawFileMetadata> findByChecksum(String checksum);

    List<NasaRawFileMetadata> findByProcessingStatus(String processingStatus);
}
