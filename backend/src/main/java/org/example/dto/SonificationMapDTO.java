package org.example.dto;

import java.util.List;

/**
 * Machine-readable sonification contract for the future frontend audio engine.
 * The backend does not generate audio.
 */
public record SonificationMapDTO(
        String phenomenonId,
        String apiVersion,
        String mappingVersion,
        String status,
        String description,
        Domain domain,
        List<ParameterMapping> mappings,
        MissingValueHandling missingValue,
        Tempo tempo,
        String implementationNote,
        List<String> notes
) {

    public record Domain(
            double min,
            double max,
            String unit,
            String scaling,
            double minFrequencyHz,
            double maxFrequencyHz,
            double baselineFrequencyHz,
            String curve
    ) {
    }

    public record ParameterMapping(
            String dataField,
            String soundParameter,
            String direction,
            String description
    ) {
    }

    public record MissingValueHandling(
            String behavior,
            boolean silence,
            boolean neverSubstituteZero,
            String announcement
    ) {
    }

    public record Tempo(
            int defaultMillisPerRecord,
            List<Double> supportedSpeedMultipliers
    ) {
    }
}
