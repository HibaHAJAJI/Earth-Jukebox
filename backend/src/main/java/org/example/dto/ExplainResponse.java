package org.example.dto;

/**
 * Response contract for NASA data explanation endpoints.
 *
 * <p>Distinguishes retrieved NASA facts from AI-generated interpretation.
 * The validation status reflects whether the underlying source data was
 * found and structurally validated; it does not imply independent scientific
 * verification of the AI-generated explanation.
 */
public record ExplainResponse(

        String explanation,

        String retrievedData,

        String datasetSource,

        String yearsCovered,

        String unit,

        String language,

        ValidationStatus validationStatus,

        String limitations
) {

    /**
     * Represents the validation status of the underlying NASA source data.
     * This does not imply independent scientific verification of the AI explanation.
     */
    public enum ValidationStatus {
        DATA_VALIDATED,    // Source data was found and structurally validated
        INSUFFICIENT_DATA, // Requested data was available but incomplete
        DATA_NOT_FOUND     // No data exists for the requested parameters
    }
}
