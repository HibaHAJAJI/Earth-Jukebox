package org.example.dto;

import java.util.List;

public record SeriesResponse<T>(
        SeriesMetadataDTO metadata,
        List<T> data
) {
}
