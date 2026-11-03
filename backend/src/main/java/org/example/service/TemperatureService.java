
package org.example.service;

import org.example.model.TemperatureRecord;
import org.example.repository.TemperatureRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TemperatureService {

    private final TemperatureRecordRepository temperatureRepository;

    public TemperatureService(TemperatureRecordRepository temperatureRepository) {
        this.temperatureRepository = temperatureRepository;
    }

    public List<TemperatureRecord> getAllRecords() {
        return temperatureRepository.findAll();
    }

    public List<TemperatureRecord> getRecordsByYear(Integer year) {
        return temperatureRepository.findByYear(year);
    }

    public List<TemperatureRecord> getRecordsBetweenYears(
            Integer startYear, Integer endYear) {
        return temperatureRepository.findByYearBetween(startYear, endYear);
    }
}
