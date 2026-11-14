package org.example.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Phenomenon catalog entry. This is a public DTO, not a persistence entity.
 */
public record PhenomenonDTO(
        String id,
        String title,
        String description,
        String source,
        String sourceUrl,
        String unit,
        String baseline,
        String status,
        List<String> resolutions,
        DatasetCoverageDTO monthly,
        DatasetCoverageDTO annual,
        String dataVersion,
        @JsonProperty("isMock") boolean mock,
        String retrievedAt,
        String license
) {
}
