package org.example.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request contract for explaining a single year of NASA temperature data.
 *
 * <p>Year is mandatory and must be >= 1880. No upper bound is enforced here;
 * actual dataset availability is validated by the service layer.
 */
public record ExplainRequest(

        @NotNull(message = "Year is required")
        @Min(value = 1880, message = "Year must be >= 1880")
        Integer year
) {
}
