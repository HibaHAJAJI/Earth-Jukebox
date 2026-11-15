package org.example.model.nasa;

import java.time.LocalDateTime;

/**
 * Metadata for a NASA data source available for import.
 *
 * <p>Describes the source, variables, units, coverage, and integration
 * status of each NASA dataset. This is catalog information, not the
 * measurement data itself.
 *
 * <p>Plain data class; persistence annotations are applied separately
 * behind the "postgres" profile.
 */
public class NasaDatasetMetadata {

    private Long id;
    private String datasetId;
    private String datasetName;
    private String nasaSource;
    private String officialDocumentation;
    private String apiEndpoint;
    private String downloadEndpoint;
    private String authentication;
    private String dataFormat;
    private String variables;
    private String units;
    private String temporalCoverage;
    private String spatialCoverage;
    private String integrationType;
    private String status;
    private String notes;

    public NasaDatasetMetadata() {
    }

    public NasaDatasetMetadata(
            String datasetId,
            String datasetName,
            String nasaSource,
            String officialDocumentation,
            String apiEndpoint,
            String downloadEndpoint,
            String authentication,
            String dataFormat,
            String variables,
            String units,
            String temporalCoverage,
            String spatialCoverage,
            String integrationType,
            String status,
            String notes
    ) {
        this.datasetId = datasetId;
        this.datasetName = datasetName;
        this.nasaSource = nasaSource;
        this.officialDocumentation = officialDocumentation;
        this.apiEndpoint = apiEndpoint;
        this.downloadEndpoint = downloadEndpoint;
        this.authentication = authentication;
        this.dataFormat = dataFormat;
        this.variables = variables;
        this.units = units;
        this.temporalCoverage = temporalCoverage;
        this.spatialCoverage = spatialCoverage;
        this.integrationType = integrationType;
        this.status = status;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String datasetId) { this.datasetId = datasetId; }
    public String getDatasetName() { return datasetName; }
    public void setDatasetName(String datasetName) { this.datasetName = datasetName; }
    public String getNasaSource() { return nasaSource; }
    public void setNasaSource(String nasaSource) { this.nasaSource = nasaSource; }
    public String getOfficialDocumentation() { return officialDocumentation; }
    public void setOfficialDocumentation(String officialDocumentation) { this.officialDocumentation = officialDocumentation; }
    public String getApiEndpoint() { return apiEndpoint; }
    public void setApiEndpoint(String apiEndpoint) { this.apiEndpoint = apiEndpoint; }
    public String getDownloadEndpoint() { return downloadEndpoint; }
    public void setDownloadEndpoint(String downloadEndpoint) { this.downloadEndpoint = downloadEndpoint; }
    public String getAuthentication() { return authentication; }
    public void setAuthentication(String authentication) { this.authentication = authentication; }
    public String getDataFormat() { return dataFormat; }
    public void setDataFormat(String dataFormat) { this.dataFormat = dataFormat; }
    public String getVariables() { return variables; }
    public void setVariables(String variables) { this.variables = variables; }
    public String getUnits() { return units; }
    public void setUnits(String units) { this.units = units; }
    public String getTemporalCoverage() { return temporalCoverage; }
    public void setTemporalCoverage(String temporalCoverage) { this.temporalCoverage = temporalCoverage; }
    public String getSpatialCoverage() { return spatialCoverage; }
    public void setSpatialCoverage(String spatialCoverage) { this.spatialCoverage = spatialCoverage; }
    public String getIntegrationType() { return integrationType; }
    public void setIntegrationType(String integrationType) { this.integrationType = integrationType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
