package org.example.service.ai;

import org.example.dto.NasaDataContext;
import org.example.dto.nasa.EnvironmentalRecordInput;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds a multi-source NASA data context for AI explanation generation.
 *
 * <p>Preserves provenance, units, and data quality information from each
 * source. Designed to support future aggregation of multiple NASA sources
 * (GISTEMP, MUR SST, OSCAR, GEOS, GEDI, ISS LIS) into a single explanation
 * context without changing the public contract of POST /api/v1/ai/explain.
 *
 * <p>Missing values are preserved as null; never estimated or interpolated.
 * Retrieved facts are kept separate from source metadata.
 */
@Component
public class MultiSourceNasaContextBuilder {

    /**
     * Builds a compact context from a single source's records.
     *
     * @param sourceName     the NASA source name (e.g., "NASA GISS GISTEMP v4")
     * @param unit           the measurement unit (e.g., "°C", "m s⁻¹")
     * @param yearsUsed      the year or period covered
     * @param records        the retrieved records (never null)
     * @param dataLimitations human-readable limitations description
     * @return a populated NasaDataContext
     */
    public NasaDataContext buildContext(
            String sourceName,
            String unit,
            String yearsUsed,
            List<EnvironmentalRecordInput> records,
            String dataLimitations
    ) {
        List<NasaDataContext.NasaFact> facts = new ArrayList<>();

        for (EnvironmentalRecordInput record : records) {
            facts.add(new NasaDataContext.NasaFact(
                    record.year(),
                    record.month(),
                    record.value(),
                    null,
                    null
            ));
        }

        NasaDataContext.CalculatedStatistics statistics = calculateStatistics(facts);

        boolean hasMissingData = facts.stream().anyMatch(f -> f.anomaly() == null);
        String missingDataDescription = hasMissingData
                ? "Missing values preserved as null; not estimated or interpolated."
                : null;

        return new NasaDataContext(
                sourceName,
                yearsUsed,
                unit,
                dataLimitations,
                facts,
                statistics,
                null,
                hasMissingData,
                missingDataDescription,
                null
        );
    }

    /**
     * Builds a context from multiple sources, preserving source provenance
     * for each fact. Each source's records are kept separate; no merging
     * of heterogeneous measurements.
     *
     * @param sourceContexts list of per-source contexts
     * @return aggregated NasaDataContext
     */
    public NasaDataContext buildMultiSourceContext(
            List<SourceContext> sourceContexts
    ) {
        List<NasaDataContext.NasaFact> allFacts = new ArrayList<>();
        StringBuilder limitations = new StringBuilder();
        boolean hasMissingData = false;
        StringBuilder missingDesc = new StringBuilder();

        for (SourceContext sc : sourceContexts) {
            for (EnvironmentalRecordInput record : sc.records()) {
                allFacts.add(new NasaDataContext.NasaFact(
                        record.year(),
                        record.month(),
                        record.value(),
                        null,
                        null
                ));
                if (record.value() == null) {
                    hasMissingData = true;
                }
            }

            if (limitations.length() > 0) {
                limitations.append(" ");
            }
            limitations.append(sc.sourceName()).append(": ").append(sc.dataLimitations());

            if (sc.hasMissingData()) {
                if (missingDesc.length() > 0) {
                    missingDesc.append(" ");
                }
                missingDesc.append(sc.sourceName()).append(": ").append(sc.missingDataDescription());
            }
        }

        NasaDataContext.CalculatedStatistics statistics = calculateStatistics(allFacts);

        return new NasaDataContext(
                "Multi-source NASA",
                sourceContexts.stream()
                        .map(SourceContext::yearsUsed)
                        .reduce((a, b) -> a + ", " + b)
                        .orElse(""),
                "multiple",
                limitations.toString(),
                allFacts,
                statistics,
                null,
                hasMissingData,
                missingDesc.length() > 0 ? missingDesc.toString() : null,
                null
        );
    }

    private NasaDataContext.CalculatedStatistics calculateStatistics(
            List<NasaDataContext.NasaFact> facts
    ) {
        List<Double> values = facts.stream()
                .filter(fact -> fact.anomaly() != null)
                .map(fact -> fact.anomaly())
                .toList();

        if (values.isEmpty()) {
            return new NasaDataContext.CalculatedStatistics(
                    null, null, null,
                    "No first-to-last change calculable: no numeric values available.",
                    "Statistics not calculated: all retrieved values are null."
            );
        }

        double average = values.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(Double.NaN);
        double min = values.stream()
                .mapToDouble(Double::doubleValue)
                .min()
                .orElse(Double.NaN);
        double max = values.stream()
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(Double.NaN);

        String firstToLastChange;
        if (values.size() < 2) {
            firstToLastChange = "Insufficient data for first-to-last change determination.";
        } else {
            Double first = values.getFirst();
            Double last = values.getLast();
            if (last > first) {
                firstToLastChange = "First to last values show an increasing direction.";
            } else if (last < first) {
                firstToLastChange = "First to last values show a decreasing direction.";
            } else {
                firstToLastChange = "First to last values show no net change.";
            }
        }

        String calculationDescription = String.format(
                "Average, min, and max calculated from %d of %d retrieved record(s) "
                        + "with non-null values. First-to-last change compares only the "
                        + "first and last non-null values and is not a statistically "
                        + "established trend.",
                values.size(), facts.size()
        );

        return new NasaDataContext.CalculatedStatistics(
                average, min, max, firstToLastChange, calculationDescription
        );
    }

    /**
     * Context for one source within a multi-source aggregation.
     */
    public record SourceContext(
            String sourceName,
            String unit,
            String yearsUsed,
            List<EnvironmentalRecordInput> records,
            String dataLimitations,
            boolean hasMissingData,
            String missingDataDescription
    ) {
    }
}
