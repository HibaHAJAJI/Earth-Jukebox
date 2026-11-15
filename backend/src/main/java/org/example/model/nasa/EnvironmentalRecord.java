package org.example.model.nasa;

import java.time.LocalDateTime;

/**
 * Numerical environmental measurement from a NASA data source.
 *
 * <p>Preserves original NASA units and source identifiers. Missing values
 * remain {@code null}; never replaced with zero.
 *
 * <p>This is a plain data class. JPA annotations are not applied here;
 * persistence configuration is handled separately behind the "postgres"
 * profile to avoid breaking the default file-backed profile.
 */
public class EnvironmentalRecord {

    private Long id;
    private String datasetName;
    private Integer year;
    private Integer month;
    private String region;
    private Double value;
    private String unit;
    private String sourceUrl;
    private LocalDateTime createdAt;
    private String originalVariable;
    private String productIdentifier;
    private LocalDateTime observationTimestamp;
    private Double latitude;
    private Double longitude;
    private String qualityFlag;
    private String importBatchId;

    public EnvironmentalRecord() {
    }

    public EnvironmentalRecord(
            String datasetName,
            Integer year,
            Integer month,
            String region,
            Double value,
            String unit,
            String sourceUrl,
            String originalVariable,
            String productIdentifier,
            LocalDateTime observationTimestamp,
            Double latitude,
            Double longitude,
            String qualityFlag,
            String importBatchId
    ) {
        this.datasetName = datasetName;
        this.year = year;
        this.month = month;
        this.region = region;
        this.value = value;
        this.unit = unit;
        this.sourceUrl = sourceUrl;
        this.createdAt = LocalDateTime.now();
        this.originalVariable = originalVariable;
        this.productIdentifier = productIdentifier;
        this.observationTimestamp = observationTimestamp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.qualityFlag = qualityFlag;
        this.importBatchId = importBatchId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDatasetName() { return datasetName; }
    public void setDatasetName(String datasetName) { this.datasetName = datasetName; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getOriginalVariable() { return originalVariable; }
    public void setOriginalVariable(String originalVariable) { this.originalVariable = originalVariable; }
    public String getProductIdentifier() { return productIdentifier; }
    public void setProductIdentifier(String productIdentifier) { this.productIdentifier = productIdentifier; }
    public LocalDateTime getObservationTimestamp() { return observationTimestamp; }
    public void setObservationTimestamp(LocalDateTime observationTimestamp) { this.observationTimestamp = observationTimestamp; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public String getQualityFlag() { return qualityFlag; }
    public void setQualityFlag(String qualityFlag) { this.qualityFlag = qualityFlag; }
    public String getImportBatchId() { return importBatchId; }
    public void setImportBatchId(String importBatchId) { this.importBatchId = importBatchId; }
}
