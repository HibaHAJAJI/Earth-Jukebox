package org.example.controller.v1.nasa;

import org.example.dto.nasa.NasaDatasetSourceInfo;
import org.example.service.nasa.NasaSourceMetadataService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for NASA dataset catalog metadata.
 *
 * <p>Only active behind the "postgres" profile. Returns descriptive
 * information about available NASA data sources, not measurement data.
 */
@RestController
@RequestMapping("/api/v1/nasa")
@Profile("postgres")
public class NasaDatasetController {

    private final NasaSourceMetadataService metadataService;

    public NasaDatasetController(NasaSourceMetadataService metadataService) {
        this.metadataService = metadataService;
    }

    /**
     * Lists all registered NASA data sources with metadata.
     *
     * @return list of source info DTOs
     */
    @GetMapping("/datasets")
    public ResponseEntity<List<NasaDatasetSourceInfo>> listDatasets() {
        return ResponseEntity.ok(metadataService.listSources());
    }
}
