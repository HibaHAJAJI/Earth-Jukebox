package org.example.controller;


import org.example.model.Dataset;
import org.example.service.DatasetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/datasets")
public class DatasetController {

    private final DatasetService datasetService;

    public DatasetController(DatasetService datasetService) {
        this.datasetService = datasetService;
    }

    @GetMapping
    public ResponseEntity<List<Dataset>> getAllDatasets() {
        return ResponseEntity.ok(datasetService.getAllDatasets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Dataset> getDatasetById(@PathVariable Long id) {
        return ResponseEntity.ok(datasetService.getDatasetById(id));
    }

    @PostMapping
    public ResponseEntity<Dataset> createDataset(@RequestBody Dataset dataset) {
        Dataset savedDataset = datasetService.saveDataset(dataset);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDataset);
    }
}