package org.example.repository.nasa;

import org.example.model.nasa.EnvironmentalRecord;

import java.util.List;

/**
 * Repository for environmental measurement records.
 *
 * <p>Plain interface; JPA implementation is provided behind the "postgres"
 * profile. Default profile remains file-backed and does not use this
 * repository.
 */
public interface EnvironmentalRecordRepository {

    EnvironmentalRecord save(EnvironmentalRecord record);

    List<EnvironmentalRecord> findByDatasetName(String datasetName);

    List<EnvironmentalRecord> findByDatasetNameAndYear(String datasetName, Integer year);

    List<EnvironmentalRecord> findByDatasetNameAndYearAndMonth(String datasetName, Integer year, Integer month);

    List<EnvironmentalRecord> findByDatasetNameAndYearBetween(String datasetName, Integer startYear, Integer endYear);

    boolean existsByDatasetNameAndYearAndMonthAndImportBatchId(
            String datasetName, Integer year, Integer month, String importBatchId
    );
}
