package org.example.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Annual observation contract. The JSON field names match the existing
 * processed dataset, so the Data Analysis team's output is not renamed.
 */
public record AnnualTemperatureDTO(
        Integer year,
        Double temperature,
        @JsonProperty("moving_average_10y") Double movingAverage10y,
        Double trend
) {
}
