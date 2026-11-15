package org.example.model.nasa;

import java.time.LocalDateTime;

/**
 * Tracks import batch execution for NASA datasets.
 *
 * <p>Enables duplicate import detection and idempotent re-imports.
 *
 * <p>Plain data class; persistence annotations are applied separately
 * behind the "postgres" profile.
 */
public class NasaImportBatch {

    private Long id;
    private String datasetId;
    private String importBatchId;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String importStatus;
    private Integer recordsImported;
    private Integer recordsSkipped;
    private String sourceUrl;
    private String errorMessage;

    public NasaImportBatch() {
    }

    public NasaImportBatch(
            String datasetId,
            String importBatchId,
            String sourceUrl
    ) {
        this.datasetId = datasetId;
        this.importBatchId = importBatchId;
        this.sourceUrl = sourceUrl;
        this.startedAt = LocalDateTime.now();
        this.importStatus = "STARTED";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String datasetId) { this.datasetId = datasetId; }
    public String getImportBatchId() { return importBatchId; }
    public void setImportBatchId(String importBatchId) { this.importBatchId = importBatchId; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public String getImportStatus() { return importStatus; }
    public void setImportStatus(String importStatus) { this.importStatus = importStatus; }
    public Integer getRecordsImported() { return recordsImported; }
    public void setRecordsImported(Integer recordsImported) { this.recordsImported = recordsImported; }
    public Integer getRecordsSkipped() { return recordsSkipped; }
    public void setRecordsSkipped(Integer recordsSkipped) { this.recordsSkipped = recordsSkipped; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
