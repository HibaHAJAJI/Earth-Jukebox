package org.example.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.example.dto.AnnualTemperatureDTO;

import java.util.List;

/**
 * Existing annual sonification dataset. Field names are preserved exactly.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AnnualDatasetFile(
        String dataset,
        String source,
        String unit,
        List<AnnualTemperatureDTO> data
) {
}
