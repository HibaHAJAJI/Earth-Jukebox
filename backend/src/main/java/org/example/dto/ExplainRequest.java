package org.example.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request contract for explaining NASA temperature data for a year or year-month.
 *
 * <p>Year is mandatory and must be >= 1880. Month is optional (1-12).
 * Language is optional and must be one of: en, fr, ar. Defaults to en.
 * Actual dataset availability is validated by the service layer.
 */
public record ExplainRequest(

        @NotNull(message = "Year is required")
        @Min(value = 1880, message = "Year must be >= 1880")
        Integer year,

        Integer month,

        String language
) {
}
