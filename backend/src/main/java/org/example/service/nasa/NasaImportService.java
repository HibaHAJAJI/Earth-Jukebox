package org.example.service.nasa;

import org.example.dto.nasa.EnvironmentalRecordInput;
import org.example.model.nasa.EnvironmentalRecord;
import org.example.model.nasa.NasaImportBatch;
import org.example.model.nasa.NasaRawFileMetadata;
import org.example.repository.nasa.EnvironmentalRecordRepository;
import org.example.repository.nasa.NasaImportBatchRepository;
import org.example.repository.nasa.NasaRawFileMetadataRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates NASA dataset imports.
 *
 * <p>Coordinates provider fetch, normalization, and repository persistence.
 * Supports idempotent re-imports via import batch IDs. Does not load huge
 * datasets into memory; providers stream records incrementally.
 *
 * <p>Only active behind the "postgres" profile. Default profile remains
 * file-backed and does not use this service.
 */
/**
 * Orchestrates NASA dataset imports.
 *
 * <p>Coordinates provider fetch, normalization, and repository persistence.
 * Supports idempotent re-imports via import batch IDs. Does not load huge
 * datasets into memory; providers stream records incrementally.
 *
 * <p>Plain service; Spring bean creation is handled by a configuration
 * class behind the "postgres" profile.
 */
public class NasaImportService {

    private final NasaDatasetRegistry registry;
    private final EnvironmentalRecordRepository recordRepository;
    private final NasaImportBatchRepository batchRepository;
    private final NasaRawFileMetadataRepository rawFileRepository;

    public NasaImportService(
            NasaDatasetRegistry registry,
            EnvironmentalRecordRepository recordRepository,
            NasaImportBatchRepository batchRepository,
            NasaRawFileMetadataRepository rawFileRepository
    ) {
        this.registry = registry;
        this.recordRepository = recordRepository;
        this.batchRepository = batchRepository;
        this.rawFileRepository = rawFileRepository;
    }

    /**
     * Imports data for a given dataset and year.
     *
     * @param datasetId the dataset ID (never null)
     * @param year      the year to import (must be >= 1880)
     * @return import result with record count and status
     * @throws NasaDataException if the dataset is not registered or import fails
     */
    public ImportResult importDataset(String datasetId, int year) {
        if (year < 1880) {
            throw new NasaDataException("Year must be >= 1880, got: " + year);
        }

        NasaDatasetProvider provider = registry.getProvider(datasetId)
                .orElseThrow(() -> new NasaDataException("Unknown dataset: " + datasetId));

        if (!provider.isAvailable()) {
            throw new NasaDataException("Provider not available: " + datasetId);
        }

        String importBatchId = UUID.randomUUID().toString();
        NasaImportBatch batch = new NasaImportBatch(datasetId, importBatchId, "provider:" + datasetId);
        batch = batchRepository.save(batch);

        try {
            List<EnvironmentalRecordInput> inputs = provider.fetchData(year);

            int imported = 0;
            int skipped = 0;

            for (EnvironmentalRecordInput input : inputs) {
                boolean duplicate = recordRepository.existsByDatasetNameAndYearAndMonthAndImportBatchId(
                        input.datasetName(), input.year(), input.month(), importBatchId
                );

                if (duplicate) {
                    skipped++;
                    continue;
                }

                EnvironmentalRecord record = toEntity(input, importBatchId);
                recordRepository.save(record);
                imported++;
            }

            batch.setCompletedAt(LocalDateTime.now());
            batch.setImportStatus(imported > 0 || skipped > 0 ? "COMPLETED" : "COMPLETED");
            batch.setRecordsImported(imported);
            batch.setRecordsSkipped(skipped);
            batchRepository.save(batch);

            return new ImportResult(
                    datasetId,
                    imported,
                    skipped,
                    "SUCCESS",
                    importBatchId
            );

        } catch (Exception e) {
            batch.setCompletedAt(LocalDateTime.now());
            batch.setImportStatus("FAILED");
            batch.setErrorMessage(e.getMessage());
            batchRepository.save(batch);
            throw new NasaDataException("Import failed for dataset " + datasetId, e);
        }
    }

    private EnvironmentalRecord toEntity(EnvironmentalRecordInput input, String importBatchId) {
        return new EnvironmentalRecord(
                input.datasetName(),
                input.year(),
                input.month(),
                input.region(),
                input.value(),
                input.unit(),
                input.sourceUrl(),
                input.originalVariable(),
                input.productIdentifier(),
                input.observationTimestamp(),
                input.latitude(),
                input.longitude(),
                input.qualityFlag(),
                importBatchId
        );
    }

    /**
     * Result of a NASA dataset import.
     */
    public record ImportResult(
            String dataset,
            int recordsImported,
            int recordsSkipped,
            String status,
            String importBatchId
    ) {
    }
}
