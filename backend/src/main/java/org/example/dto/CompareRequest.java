package org.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Request contract for comparing two NASA data periods.
 *
 * <p>Both fields are mandatory and must match the YYYY-YYYY format.
 * Cross-field validation (start year <= end year, first period precedes second)
 * is performed by the service layer, not here.
 */
public record CompareRequest(

        @NotNull(message = "startPeriod is required")
        @NotBlank(message = "startPeriod must not be blank")
        @Pattern(
                regexp = "^\\d{4}-\\d{4}$",
                message = "startPeriod must be in YYYY-YYYY format"
        )
        String startPeriod,

        @NotNull(message = "endPeriod is required")
        @NotBlank(message = "endPeriod must not be blank")
        @Pattern(
                regexp = "^\\d{4}-\\d{4}$",
                message = "endPeriod must be in YYYY-YYYY format"
        )
        String endPeriod
) {
}
