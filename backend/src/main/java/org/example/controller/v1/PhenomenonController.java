package org.example.controller.v1;

import org.example.dto.PhenomenonDTO;
import org.example.dto.PhenomenonListResponse;
import org.example.dto.SeriesResponse;
import org.example.dto.SonificationMapDTO;
import org.example.service.PhenomenonCatalogService;
import org.example.service.SonificationMapService;
import org.example.service.TemperatureSeriesService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/phenomena")
public class PhenomenonController {

    private final PhenomenonCatalogService catalogService;
    private final TemperatureSeriesService seriesService;
    private final SonificationMapService sonificationMapService;

    public PhenomenonController(
            PhenomenonCatalogService catalogService,
            TemperatureSeriesService seriesService,
            SonificationMapService sonificationMapService
    ) {
        this.catalogService = catalogService;
        this.seriesService = seriesService;
        this.sonificationMapService = sonificationMapService;
    }

    @GetMapping
    public ResponseEntity<PhenomenonListResponse> listPhenomena() {
        return ResponseEntity.ok(catalogService.listPhenomena());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PhenomenonDTO> getPhenomenon(@PathVariable String id) {
        return ResponseEntity.ok(catalogService.getPhenomenon(id));
    }

    @GetMapping("/{id}/series")
    public ResponseEntity<SeriesResponse<?>> getSeries(
            @PathVariable String id,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false, defaultValue = "monthly") String resolution
    ) {
        return ResponseEntity.ok(seriesService.getSeries(id, from, to, resolution));
    }

    @GetMapping("/{id}/sonification-map")
    public ResponseEntity<SonificationMapDTO> getSonificationMap(@PathVariable String id) {
        return ResponseEntity.ok(sonificationMapService.getMap(id));
    }
}
