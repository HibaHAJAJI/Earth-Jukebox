
package org.example.controller;

import org.example.model.TemperatureRecord;
import org.example.service.TemperatureService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/temperatures")
public class TemperatureController {

    private final TemperatureService temperatureService;

    public TemperatureController(TemperatureService temperatureService) {
        this.temperatureService = temperatureService;
    }

    @GetMapping
    public ResponseEntity<List<TemperatureRecord>> getAllRecords() {
        return ResponseEntity.ok(temperatureService.getAllRecords());
    }

    @GetMapping("/year/{year}")
    public ResponseEntity<List<TemperatureRecord>> getRecordsByYear(
            @PathVariable Integer year) {
        return ResponseEntity.ok(
                temperatureService.getRecordsByYear(year)
        );
    }

    @GetMapping("/range")
    public ResponseEntity<List<TemperatureRecord>> getRecordsBetweenYears(
            @RequestParam Integer startYear,
            @RequestParam Integer endYear) {

        if (startYear > endYear) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(
                temperatureService.getRecordsBetweenYears(startYear, endYear)
        );
    }
}
