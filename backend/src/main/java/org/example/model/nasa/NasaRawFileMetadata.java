package org.example.model.nasa;

import java.time.LocalDateTime;

/**
 * Metadata for raw NASA data files stored locally.
 *
 * <p>Records source URL, checksum, file size, dataset identifier,
 * processing status, and download timestamp. Raw files are stored
 * under data/raw/, processed outputs under data/processed/.
 *
 * <p>Plain data class; persistence annotations are applied separately
 * behind the "postgres" profile.
 */
public class NasaRawFileMetadata {

    private Long id;
    private String datasetId;
    private String sourceUrl;
    private String checksum;
    private Long fileSizeBytes;
    private LocalDateTime downloadTimestamp;
    private String processingStatus;
    private String localFilePath;
    private String notes;

    public NasaRawFileMetadata() {
    }

    public NasaRawFileMetadata(
            String datasetId,
            String sourceUrl,
            String checksum,
            Long fileSizeBytes,
            String processingStatus,
            String localFilePath,
            String notes
    ) {
        this.datasetId = datasetId;
        this.sourceUrl = sourceUrl;
        this.checksum = checksum;
        this.fileSizeBytes = fileSizeBytes;
        this.downloadTimestamp = LocalDateTime.now();
        this.processingStatus = processingStatus;
        this.localFilePath = localFilePath;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String datasetId) { this.datasetId = datasetId; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public String getChecksum() { return checksum; }
    public void setChecksum(String checksum) { this.checksum = checksum; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(Long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }
    public LocalDateTime getDownloadTimestamp() { return downloadTimestamp; }
    public void setDownloadTimestamp(LocalDateTime downloadTimestamp) { this.downloadTimestamp = downloadTimestamp; }
    public String getProcessingStatus() { return processingStatus; }
    public void setProcessingStatus(String processingStatus) { this.processingStatus = processingStatus; }
    public String getLocalFilePath() { return localFilePath; }
    public void setLocalFilePath(String localFilePath) { this.localFilePath = localFilePath; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
