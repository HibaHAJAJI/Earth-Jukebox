package org.example.dto;

import java.util.List;

public record PhenomenonListResponse(
        List<PhenomenonDTO> phenomena,
        int count
) {
}
