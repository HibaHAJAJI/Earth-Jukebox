package org.example.repository;

import org.example.model.TemperatureRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface TemperatureRecordRepository extends JpaRepository<TemperatureRecord, Long> {

    List<TemperatureRecord> findByYear(Integer year);

    List<TemperatureRecord> findByYearBetween(Integer startYear, Integer endYear);
}
