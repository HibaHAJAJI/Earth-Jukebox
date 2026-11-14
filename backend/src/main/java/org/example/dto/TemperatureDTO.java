package org.example.dto;

/**
 * Monthly observation contract consumed by the frontend.
 */
public record TemperatureDTO(
        Integer year,
        Integer month,
        Double anomaly
) {
}
