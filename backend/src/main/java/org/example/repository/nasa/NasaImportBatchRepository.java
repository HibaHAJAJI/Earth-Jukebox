package org.example.repository.nasa;

import org.example.model.nasa.NasaImportBatch;

import java.util.List;
import java.util.Optional;

/**
 * Repository for NASA import batch tracking.
 */
public interface NasaImportBatchRepository {

    List<NasaImportBatch> findByDatasetId(String datasetId);

    Optional<NasaImportBatch> findByImportBatchId(String importBatchId);

    List<NasaImportBatch> findByImportStatus(String importStatus);
}
