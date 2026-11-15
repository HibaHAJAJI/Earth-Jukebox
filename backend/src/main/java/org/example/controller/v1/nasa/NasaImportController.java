package org.example.controller.v1.nasa;

import org.example.service.nasa.NasaImportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for NASA dataset import operations.
 *
 * <p>Only active behind the "postgres" profile. Default file-backed
 * profile does not expose these endpoints.
 */
@RestController
@RequestMapping("/api/v1/nasa")
@Profile("postgres")
public class NasaImportController {

    private final NasaImportService importService;
    private final int maxImportYear;

    public NasaImportController(
            NasaImportService importService,
            @Value("${nasa.import.max-year:2100}") int maxImportYear
    ) {
        this.importService = importService;
        this.maxImportYear = maxImportYear;
    }

    /**
     * Imports NASA data for a dataset and year.
     *
     * @param dataset the dataset ID (e.g., "mur-sst-v4.1")
     * @param year    the year to import (query parameter)
     * @return import result
     */
    @PostMapping("/import/{dataset}")
    public ResponseEntity<ImportResponse> importDataset(
            @PathVariable String dataset,
            @RequestParam int year
    ) {
        if (year < 1880 || year > maxImportYear) {
            return ResponseEntity.badRequest()
                    .body(new ImportResponse(dataset, 0, 0, "INVALID_YEAR", null,
                            "Year must be between 1880 and " + maxImportYear));
        }

        NasaImportService.ImportResult result = importService.importDataset(dataset, year);
        return ResponseEntity.ok(new ImportResponse(
                result.dataset(),
                result.recordsImported(),
                result.recordsSkipped(),
                result.status(),
                result.importBatchId(),
                null
        ));
    }

    /**
     * Import response DTO.
     */
    public record ImportResponse(
            String dataset,
            int recordsImported,
            int recordsSkipped,
            String status,
            String importBatchId,
            String error
    ) {
    }
}
