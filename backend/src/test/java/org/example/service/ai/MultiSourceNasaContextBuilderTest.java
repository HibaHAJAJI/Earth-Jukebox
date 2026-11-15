package org.example.service.ai;

import org.example.dto.NasaDataContext;
import org.example.dto.nasa.EnvironmentalRecordInput;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for MultiSourceNasaContextBuilder. No external dependencies.
 */
class MultiSourceNasaContextBuilderTest {

    @Test
    void buildsContextWithProvenanceAndUnits() {
        MultiSourceNasaContextBuilder builder = new MultiSourceNasaContextBuilder();

        List<EnvironmentalRecordInput> records = List.of(
                new EnvironmentalRecordInput(
                        "NASA GISS GISTEMP v4", 2023, 1, "global",
                        1.2, "°C", "https://data.giss.nasa.gov/",
                        "anomaly", "GISTEMP v4",
                        LocalDateTime.of(2023, 1, 15, 0, 0),
                        null, null, null
                ),
                new EnvironmentalRecordInput(
                        "NASA GISS GISTEMP v4", 2023, 2, "global",
                        null, "°C", "https://data.giss.nasa.gov/",
                        "anomaly", "GISTEMP v4",
                        LocalDateTime.of(2023, 2, 15, 0, 0),
                        null, null, null
                )
        );

        NasaDataContext ctx = builder.buildContext(
                "NASA GISS GISTEMP v4",
                "°C",
                "2023",
                records,
                "Missing values preserved as null"
        );

        assertThat(ctx.datasetSource()).isEqualTo("NASA GISS GISTEMP v4");
        assertThat(ctx.yearsUsed()).isEqualTo("2023");
        assertThat(ctx.unit()).isEqualTo("°C");
        assertThat(ctx.hasMissingData()).isTrue();
        assertThat(ctx.missingDataDescription()).contains("null");
        assertThat(ctx.retrievedFacts()).hasSize(2);

        // First fact has value, second is null
        assertThat(ctx.retrievedFacts().get(0).anomaly()).isEqualTo(1.2);
        assertThat(ctx.retrievedFacts().get(1).anomaly()).isNull();
    }

    void preservesNullValuesNeverReplacesWithZero() {
        MultiSourceNasaContextBuilder builder = new MultiSourceNasaContextBuilder();

        List<EnvironmentalRecordInput> records = List.of(
                new EnvironmentalRecordInput(
                        "MUR SST", 2023, 1, "global",
                        null, "°C", "https://podaac.jpl.nasa.gov/",
                        "analysed_sst", "MUR-JPL-L4-GLOB-v4.1",
                        LocalDateTime.of(2023, 1, 15, 0, 0),
                        0.0, 0.0, null
                )
        );

        NasaDataContext ctx = builder.buildContext(
                "MUR SST", "°C", "2023", records,
                "Missing SST values are null"
        );

        assertThat(ctx.retrievedFacts()).hasSize(1);
        assertThat(ctx.retrievedFacts().get(0).anomaly()).isNull();
        assertThat(ctx.hasMissingData()).isTrue();
        assertThat(ctx.missingDataDescription()).contains("null");
    }

    @Test
    void multiSourceAggregationPreservesProvenance() {
        MultiSourceNasaContextBuilder builder = new MultiSourceNasaContextBuilder();

        MultiSourceNasaContextBuilder.SourceContext gistemp =
                new MultiSourceNasaContextBuilder.SourceContext(
                        "NASA GISS GISTEMP v4", "°C", "2023",
                        List.of(new EnvironmentalRecordInput(
                                "NASA GISS GISTEMP v4", 2023, 1, "global",
                                1.2, "°C", "https://data.giss.nasa.gov/",
                                "anomaly", "GISTEMP v4",
                                LocalDateTime.of(2023, 1, 15, 0, 0),
                                null, null, null
                        )),
                        "Missing values null", false, null
                );

        MultiSourceNasaContextBuilder.SourceContext murSst =
                new MultiSourceNasaContextBuilder.SourceContext(
                        "MUR SST v4.1", "°C", "2023",
                        List.of(new EnvironmentalRecordInput(
                                "MUR SST v4.1", 2023, 1, "global",
                                null, "°C", "https://podaac.jpl.nasa.gov/",
                                "analysed_sst", "MUR-JPL-L4-GLOB-v4.1",
                                LocalDateTime.of(2023, 1, 15, 0, 0),
                                null, null, null
                        )),
                        "Missing SST null", true, "SST missing for Jan 2023"
                );

        NasaDataContext ctx = builder.buildMultiSourceContext(List.of(gistemp, murSst));

        assertThat(ctx.retrievedFacts()).hasSize(2);
        assertThat(ctx.hasMissingData()).isTrue();
        assertThat(ctx.missingDataDescription()).contains("MUR SST");
        assertThat(ctx.dataLimitations()).contains("NASA GISS GISTEMP v4");
        assertThat(ctx.dataLimitations()).contains("MUR SST v4.1");
    }
}
