package org.example.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Optional persistence model for future database-backed dataset metadata.
 * The MVP file-backed API does not require this entity.
 */
@Entity
@Table(name = "datasets")
public class Dataset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String description;

    private String referencePeriod;

    private String sourceUrl;

    private LocalDate lastUpdated;

    @JsonIgnore
    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TemperatureRecord> records = new ArrayList<>();

    public Dataset() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getReferencePeriod() {
        return referencePeriod;
    }

    public void setReferencePeriod(String referencePeriod) {
        this.referencePeriod = referencePeriod;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public LocalDate getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDate lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public List<TemperatureRecord> getRecords() {
        return records;
    }

    public void setRecords(List<TemperatureRecord> records) {
        this.records = records;
    }

    public void addRecord(TemperatureRecord record) {
        records.add(record);
        record.setDataset(this);
    }

    public void removeRecord(TemperatureRecord record) {
        records.remove(record);
        record.setDataset(null);
    }
}
