package org.example.controller.v1;

import org.example.dto.ApiMetaDTO;
import org.example.service.PhenomenonCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MetaController {

    private final PhenomenonCatalogService catalogService;

    public MetaController(PhenomenonCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/meta")
    public ResponseEntity<ApiMetaDTO> getMeta() {
        return ResponseEntity.ok(catalogService.getMeta());
    }
}
