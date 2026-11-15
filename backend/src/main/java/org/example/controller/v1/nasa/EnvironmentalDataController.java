package org.example.controller.v1.nasa;

import org.example.model.nasa.EnvironmentalRecord;
import org.example.repository.nasa.EnvironmentalRecordRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for querying imported environmental data.
 *
 * <p>Supports filtering by year, month, dataset, and region.
 * Only active behind the "postgres" profile.
 */
@RestController
@RequestMapping("/api/v1/environmental-data")
@Profile("postgres")
public class EnvironmentalDataController {

    private final EnvironmentalRecordRepository repository;

    public EnvironmentalDataController(EnvironmentalRecordRepository repository) {
        this.repository = repository;
    }

    /**
     * Queries environmental records with optional filters.
     *
     * @param dataset  optional dataset ID filter
     * @param year     optional year filter
     * @param month    optional month filter (1-12)
     * @param region   optional region filter
     * @return list of environmental records
     */
    @GetMapping
    public ResponseEntity<List<EnvironmentalRecord>> query(
            @RequestParam(required = false) String dataset,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String region
    ) {
        List<EnvironmentalRecord> result;

        if (dataset != null && year != null && month != null) {
            result = repository.findByDatasetNameAndYearAndMonth(dataset, year, month);
        } else if (dataset != null && year != null) {
            result = repository.findByDatasetNameAndYear(dataset, year);
        } else if (dataset != null) {
            result = repository.findByDatasetName(dataset);
        } else {
            result = List.of();
        }

        return ResponseEntity.ok(result);
    }
}
