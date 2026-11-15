package org.example;

import org.example.dto.NasaDataContext;
import org.example.exception.InvalidQueryException;
import org.example.service.NasaDataRetrievalService;
import org.example.service.ai.NasaDataContextBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class NasaRetrievalAndContextTest {

    @Autowired
    private NasaDataRetrievalService retrievalService;

    @Autowired
    private NasaDataContextBuilder contextBuilder;

    @Test
    void retrievesExistingYearMonthlyRecords() {
        NasaDataRetrievalService.YearData data = retrievalService.retrieveByYear(2023);

        assertThat(data.year()).isEqualTo(2023);
        assertThat(data.monthlyRecords()).isNotEmpty();
        assertThat(data.annualRecords()).isNotEmpty();

        var jan2023 = data.monthlyRecords().stream()
                .filter(r -> r.month() == 1)
                .findFirst()
                .orElseThrow();
        assertThat(jan2023.anomaly()).isNotNull();
    }

    @Test
    void retrievesNonexistentYearReturnsEmptyRecords() {
        NasaDataRetrievalService.YearData data = retrievalService.retrieveByYear(9999);

        assertThat(data.year()).isEqualTo(9999);
        assertThat(data.monthlyRecords()).isEmpty();
        assertThat(data.annualRecords()).isEmpty();
    }

    @Test
    void rejectsYearBelow1880() {
        assertThatThrownBy(() -> retrievalService.retrieveByYear(1879))
                .isInstanceOf(InvalidQueryException.class)
                .hasMessage("Year must be >= 1880");
    }

    @Test
    void rejectsNullYear() {
        assertThatThrownBy(() -> retrievalService.retrieveByYear(null))
                .isInstanceOf(InvalidQueryException.class)
                .hasMessage("Year is required");
    }

    @Test
    void retrievesValidSinglePeriod() {
        NasaDataRetrievalService.PeriodData data = retrievalService.retrieveByPeriod("2020-2025");

        assertThat(data.period()).isEqualTo("2020-2025");
        assertThat(data.monthlyRecords()).isNotEmpty();
        assertThat(data.monthlyRecords()).allMatch(r -> r.year() >= 2020 && r.year() <= 2025);
    }

    @Test
    void retrievesTwoIndependentPeriodsSeparately() {
        NasaDataRetrievalService.TwoPeriodData twoPeriods = retrievalService.retrieveTwoPeriods(
                "1880-1920", "1980-2025"
        );

        assertThat(twoPeriods.firstPeriod().period()).isEqualTo("1880-1920");
        assertThat(twoPeriods.secondPeriod().period()).isEqualTo("1980-2025");

        // No records leaking between periods
        assertThat(twoPeriods.firstPeriod().monthlyRecords())
                .allMatch(r -> r.year() >= 1880 && r.year() <= 1920);
        assertThat(twoPeriods.secondPeriod().monthlyRecords())
                .allMatch(r -> r.year() >= 1980 && r.year() <= 2025);

        // Verify no year overlap between the two period datasets
        List<Integer> firstYears = twoPeriods.firstPeriod().monthlyRecords().stream()
                .map(r -> r.year()).distinct().sorted().toList();
        List<Integer> secondYears = twoPeriods.secondPeriod().monthlyRecords().stream()
                .map(r -> r.year()).distinct().sorted().toList();
        assertThat(firstYears).doesNotContainAnyElementsOf(secondYears);
    }

    @Test
    void rejectsInvalidPeriodFormat() {
        assertThatThrownBy(() -> retrievalService.retrieveByPeriod("invalid"))
                .isInstanceOf(InvalidQueryException.class)
                .hasMessageContaining("period must be in YYYY-YYYY format");
    }

    @Test
    void rejectsPeriodOutsideDatasetCoverage() {
        assertThatThrownBy(() -> retrievalService.retrieveByPeriod("1700-1750"))
                .isInstanceOf(InvalidQueryException.class)
                .hasMessageContaining("No NASA data available");
    }

    @Test
    void contextForYearHasCorrectMetadata() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(2023);

        assertThat(ctx.datasetSource()).isEqualTo("NASA GISS GISTEMP v4");
        assertThat(ctx.yearsUsed()).isEqualTo("2023");
        assertThat(ctx.unit()).isEqualTo("°C");
        assertThat(ctx.dataLimitations()).isNotNull();
        assertThat(ctx.retrievedFacts()).isNotEmpty();
        assertThat(ctx.calculatedStatistics()).isNotNull();
        assertThat(ctx.sonificationContext()).isNotNull();
        assertThat(ctx.missingDataReport()).isNotNull();
    }

    @Test
    void contextForYearSeparatesFactsFromStatistics() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(2023);

        // Retrieved facts: actual NASA values
        assertThat(ctx.retrievedFacts()).allMatch(f -> f.year() != null);
        assertThat(ctx.retrievedFacts()).allMatch(f -> f.anomaly() != null);

        // Calculated statistics: derived aggregates, labeled as first-to-last change
        assertThat(ctx.calculatedStatistics().averageAnomaly()).isNotNull();
        assertThat(ctx.calculatedStatistics().firstToLastChange()).isNotNull();
        assertThat(ctx.calculatedStatistics().calculationDescription())
                .contains("not a statistically established trend");
    }

    @Test
    void contextForYearWithMissingValuesPreservesNulls() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(2026);

        assertThat(ctx.hasMissingData()).isTrue();
        assertThat(ctx.missingDataDescription()).isNotNull();
        assertThat(ctx.missingDataDescription()).contains("null");

        // Verify nulls are not replaced with zero
        assertThat(ctx.retrievedFacts())
                .anyMatch(f -> f.anomaly() == null);
    }

    @Test
    void contextForYearMissingDataReportTracksAllFields() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(1880);

        // 1880 annual record: anomaly present, movingAverage null, trend present
        NasaDataContext.MissingDataReport report = ctx.missingDataReport();
        assertThat(report.totalRecords()).isGreaterThan(0);
        assertThat(report.recordsWithNullMovingAverage()).isGreaterThan(0);
        assertThat(report.missingFieldDescriptions())
                .anyMatch(d -> d.contains("moving average"));
    }

    @Test
    void contextForAnnualWithNullMovingAverage() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(1880);

        // 1880 annual record has null moving_average_10y
        var annualFact = ctx.retrievedFacts().stream()
                .filter(f -> f.month() == null)
                .findFirst()
                .orElse(null);
        assertThat(annualFact).isNotNull();
        assertThat(annualFact.movingAverage()).isNull();
        assertThat(annualFact.anomaly()).isNotNull();
    }

    @Test
    void contextForAnnualWithNullTrend() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(1880);

        // 1880 annual record: trend exists in the dataset
        var annualFact = ctx.retrievedFacts().stream()
                .filter(f -> f.month() == null)
                .findFirst()
                .orElse(null);
        assertThat(annualFact).isNotNull();
        assertThat(annualFact.trend()).isNotNull();
    }

    @Test
    void contextForPeriodHasCorrectMetadata() {
        NasaDataContext ctx = contextBuilder.buildContextForPeriod("2020-2025");

        assertThat(ctx.datasetSource()).isEqualTo("NASA GISS GISTEMP v4");
        assertThat(ctx.yearsUsed()).isEqualTo("2020-2025");
        assertThat(ctx.unit()).isEqualTo("°C");
        assertThat(ctx.retrievedFacts()).isNotEmpty();
        assertThat(ctx.calculatedStatistics()).isNotNull();
        assertThat(ctx.missingDataReport()).isNotNull();
    }

    @Test
    void contextForTwoPeriodsHaveSeparateMetadata() {
        NasaDataContext first = contextBuilder.buildContextForPeriod("1880-1920");
        NasaDataContext second = contextBuilder.buildContextForPeriod("1980-2025");

        assertThat(first.yearsUsed()).isEqualTo("1880-1920");
        assertThat(second.yearsUsed()).isEqualTo("1980-2025");
        assertThat(first.retrievedFacts())
                .allMatch(f -> f.year() >= 1880 && f.year() <= 1920);
        assertThat(second.retrievedFacts())
                .allMatch(f -> f.year() >= 1980 && f.year() <= 2025);
    }

    @Test
    void calculatedStatisticsDoNotFabricateValues() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(2023);

        var anomalies = ctx.retrievedFacts().stream()
                .filter(f -> f.anomaly() != null)
                .map(f -> f.anomaly())
                .toList();

        assertThat(ctx.calculatedStatistics().averageAnomaly())
                .isBetween(anomalies.stream().mapToDouble(Double::doubleValue).min().orElse(0),
                        anomalies.stream().mapToDouble(Double::doubleValue).max().orElse(0));
    }

    @Test
    void contextForYearDoesNotModifySourceData() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(2023);

        NasaDataRetrievalService.YearData yearData = retrievalService.retrieveByYear(2023);
        assertThat(ctx.retrievedFacts()).hasSize(
                yearData.monthlyRecords().size() + yearData.annualRecords().size()
        );
    }

    @Test
    void contextForPeriodHandlesMissingValues() {
        NasaDataContext ctx = contextBuilder.buildContextForPeriod("2026-2026");

        assertThat(ctx.hasMissingData()).isTrue();
        assertThat(ctx.missingDataDescription()).contains("null");
    }

    @Test
    void sonificationContextIsPopulated() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(2023);

        assertThat(ctx.sonificationContext().mappingId())
                .isEqualTo("global-temperature-anomaly");
        assertThat(ctx.sonificationContext().description()).isNotNull();
        assertThat(ctx.sonificationContext().missingValueBehavior())
                .isEqualTo("silence");
    }

    @Test
    void statisticsForNoDataIndicateInsufficientFirstToLastChange() {
        NasaDataContext ctx = contextBuilder.buildContextForYear(9999);

        assertThat(ctx.retrievedFacts()).isEmpty();
        assertThat(ctx.calculatedStatistics().firstToLastChange())
                .contains("No first-to-last change calculable");
    }

    @Test
    void annualCoverageExcludes2026() {
        NasaDataRetrievalService.YearData data2026 = retrievalService.retrieveByYear(2026);

        // Monthly data exists for 2026 (Jan-Sep at minimum)
        assertThat(data2026.monthlyRecords()).isNotEmpty();

        // Annual data does NOT exist for 2026 (annual mean not available)
        assertThat(data2026.annualRecords()).isEmpty();
    }

    @Test
    void monthlyCoverageIncludes2026PartialYear() {
        NasaDataRetrievalService.YearData data2026 = retrievalService.retrieveByYear(2026);

        // Monthly records exist for 2026 but with missing Oct-Dec
        assertThat(data2026.monthlyRecords()).isNotEmpty();
        assertThat(data2026.monthlyRecords())
                .allMatch(r -> r.year() == 2026);

        // Verify missing months have null anomaly
        var oct2026 = data2026.monthlyRecords().stream()
                .filter(r -> r.month() == 10)
                .findFirst();
        if (oct2026.isPresent()) {
            assertThat(oct2026.get().anomaly()).isNull();
        }
    }

    @Test
    void contextForPeriodWithNullAnomalyPreservesNull() {
        NasaDataContext ctx = contextBuilder.buildContextForPeriod("2026-2026");

        assertThat(ctx.missingDataReport().recordsWithNullAnomaly()).isGreaterThan(0);
        assertThat(ctx.retrievedFacts())
                .anyMatch(f -> f.anomaly() == null);
        // Verify null anomaly is not replaced with zero
        assertThat(ctx.retrievedFacts())
                .noneMatch(f -> f.anomaly() != null && f.anomaly() == 0.0);
    }
}
