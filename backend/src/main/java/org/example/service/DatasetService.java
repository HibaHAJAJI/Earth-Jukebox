
package org.example.service;

import org.example.model.Dataset;
import org.example.repository.DatasetRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class DatasetService {

    private final DatasetRepository datasetRepository;

    public DatasetService(DatasetRepository datasetRepository) {
        this.datasetRepository = datasetRepository;
    }

    public List<Dataset> getAllDatasets() {
        return datasetRepository.findAll();
    }

    public Dataset getDatasetById(Long id) {
        return datasetRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Dataset not found"));
    }

    public Dataset saveDataset(Dataset dataset) {
        return datasetRepository.save(dataset);
    }
}
