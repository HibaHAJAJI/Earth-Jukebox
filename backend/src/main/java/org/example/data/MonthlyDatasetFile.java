package org.example.data;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.example.dto.TemperatureDTO;

import java.util.List;

/**
 * Raw shape of the processed monthly dataset file.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MonthlyDatasetFile(
        MonthlyFileMetadata metadata,
        List<TemperatureDTO> data
) {
}
