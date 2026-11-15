package org.example.service.ai;

import org.example.data.MonthlyFileMetadata;
import org.example.data.ResourcePhenomenonDataRepository;
import org.example.dto.NasaDataContext;
import org.example.dto.TemperatureDTO;
import org.example.service.NasaDataRetrievalService;
import org.example.service.SonificationMapService;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds a compact {@link NasaDataContext} from retrieved NASA records.
 *
 * <p>Distinguishes retrieved NASA facts from calculated statistics.
 * Missing values are preserved as null; never estimated or interpolated.
 * Only the requested data subset is included; never the entire dataset.
 * Annual and monthly coverage are tracked independently.
 */
@Component
public class NasaDataContextBuilder {

    private final NasaDataRetrievalService retrievalService;
    private final ResourcePhenomenonDataRepository repository;
    private final SonificationMapService sonificationMapService;

    public NasaDataContextBuilder(
            NasaDataRetrievalService retrievalService,
            ResourcePhenomenonDataRepository repository,
            SonificationMapService sonificationMapService
    ) {
        this.retrievalService = retrievalService;
        this.repository = repository;
        this.sonificationMapService = sonificationMapService;
    }

    /**
     * Builds a context for explaining a single year of NASA data.
     *
     * @param year the year to explain
     * @return a populated NasaDataContext
     */
    public NasaDataContext buildContextForYear(Integer year) {
        NasaDataRetrievalService.YearData yearData = retrievalService.retrieveByYear(year);

        MonthlyFileMetadata metadata = repository.monthlyDataset().metadata();

        List<NasaDataContext.NasaFact> facts = buildFactsFromYearData(yearData);

        NasaDataContext.CalculatedStatistics statistics = calculateStatistics(facts);

        NasaDataContext.MissingDataReport missingReport = buildMissingDataReport(facts);
        boolean hasMissingData = missingReport.recordsWithNullAnomaly() > 0
                || missingReport.recordsWithNullMovingAverage() > 0
                || missingReport.recordsWithNullTrend() > 0;

        String missingDataDescription = hasMissingData
                ? buildMissingDataDescription(missingReport)
                : null;

        NasaDataContext.SonificationContext sonificationContext = buildSonificationContext();

        String yearsUsed = String.valueOf(year);
        boolean hasAnnualData = !yearData.annualRecords().isEmpty();
        String dataLimitations = buildDataLimitations(metadata, hasMissingData, hasAnnualData);

        return new NasaDataContext(
                metadata.source(),
                yearsUsed,
                metadata.unit(),
                dataLimitations,
                facts,
                statistics,
                sonificationContext,
                hasMissingData,
                missingDataDescription,
                missingReport
        );
    }

    /**
     * Builds a context for explaining a single period of NASA data (YYYY-YYYY).
     *
     * <p>For comparison scenarios, call this method once per period to keep
     * the two datasets separate.
     *
     * @param period the period in YYYY-YYYY format
     * @return a populated NasaDataContext
     */
    public NasaDataContext buildContextForPeriod(String period) {
        NasaDataRetrievalService.PeriodData periodData = retrievalService.retrieveByPeriod(period);

        MonthlyFileMetadata metadata = repository.monthlyDataset().metadata();

        List<NasaDataContext.NasaFact> facts = periodData.monthlyRecords().stream()
                .map(record -> new NasaDataContext.NasaFact(
                        record.year(),
                        record.month(),
                        record.anomaly(),
                        null,
                        null
                ))
                .toList();

        NasaDataContext.CalculatedStatistics statistics = calculateStatistics(facts);

        NasaDataContext.MissingDataReport missingReport = buildMissingDataReport(facts);
        boolean hasMissingData = missingReport.recordsWithNullAnomaly() > 0
                || missingReport.recordsWithNullMovingAverage() > 0
                || missingReport.recordsWithNullTrend() > 0;

        String missingDataDescription = hasMissingData
                ? buildMissingDataDescription(missingReport)
                : null;

        NasaDataContext.SonificationContext sonificationContext = buildSonificationContext();

        String dataLimitations = buildDataLimitations(metadata, hasMissingData, false);

        return new NasaDataContext(
                metadata.source(),
                period,
                metadata.unit(),
                dataLimitations,
                facts,
                statistics,
                sonificationContext,
                hasMissingData,
                missingDataDescription,
                missingReport
        );
    }

    private List<NasaDataContext.NasaFact> buildFactsFromYearData(
            NasaDataRetrievalService.YearData yearData
    ) {
        List<NasaDataContext.NasaFact> facts = new ArrayList<>();

        for (TemperatureDTO record : yearData.monthlyRecords()) {
            facts.add(new NasaDataContext.NasaFact(
                    record.year(),
                    record.month(),
                    record.anomaly(),
                    null,
                    null
            ));
        }

        for (org.example.dto.AnnualTemperatureDTO record : yearData.annualRecords()) {
            facts.add(new NasaDataContext.NasaFact(
                    record.year(),
                    null,
                    record.temperature(),
                    record.movingAverage10y(),
                    record.trend()
            ));
        }

        return facts;
    }

    private NasaDataContext.CalculatedStatistics calculateStatistics(
            List<NasaDataContext.NasaFact> facts
    ) {
        List<Double> anomalies = facts.stream()
                .filter(fact -> fact.anomaly() != null)
                .map(fact -> fact.anomaly())
                .toList();

        if (anomalies.isEmpty()) {
            return new NasaDataContext.CalculatedStatistics(
                    null,
                    null,
                    null,
                    "No first-to-last change calculable: no numeric anomaly values available.",
                    "Statistics not calculated: all retrieved anomaly values are null."
            );
        }

        double average = anomalies.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(Double.NaN);
        double min = anomalies.stream()
                .mapToDouble(Double::doubleValue)
                .min()
                .orElse(Double.NaN);
        double max = anomalies.stream()
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(Double.NaN);

        String firstToLastChange = buildFirstToLastChange(anomalies);
        String calculationDescription = String.format(
                "Average, min, and max calculated from %d of %d retrieved record(s) "
                        + "with non-null anomaly values. Moving average and trend values "
                        + "are taken directly from the dataset when available, not recalculated. "
                        + "First-to-last change compares only the first and last non-null anomaly "
                        + "values and is not a statistically established trend.",
                anomalies.size(), facts.size()
        );

        return new NasaDataContext.CalculatedStatistics(
                average,
                min,
                max,
                firstToLastChange,
                calculationDescription
        );
    }

    private String buildFirstToLastChange(List<Double> anomalies) {
        if (anomalies.size() < 2) {
            return "Insufficient data for first-to-last change determination.";
        }

        Double first = anomalies.getFirst();
        Double last = anomalies.getLast();

        if (last > first) {
            return "First to last anomaly values show an increasing direction.";
        } else if (last < first) {
            return "First to last anomaly values show a decreasing direction.";
        } else {
            return "First to last anomaly values show no net change.";
        }
    }

    private NasaDataContext.MissingDataReport buildMissingDataReport(
            List<NasaDataContext.NasaFact> facts
    ) {
        int totalRecords = facts.size();
        int nullAnomaly = (int) facts.stream()
                .filter(fact -> fact.anomaly() == null)
                .count();
        int nullMovingAverage = (int) facts.stream()
                .filter(fact -> fact.movingAverage() == null)
                .count();
        int nullTrend = (int) facts.stream()
                .filter(fact -> fact.trend() == null)
                .count();

        List<String> descriptions = new ArrayList<>();
        if (nullAnomaly > 0) {
            descriptions.add(nullAnomaly + " record(s) have null anomaly (not estimated or interpolated)");
        }
        if (nullMovingAverage > 0) {
            descriptions.add(nullMovingAverage + " record(s) have null 10-year moving average");
        }
        if (nullTrend > 0) {
            descriptions.add(nullTrend + " record(s) have null trend value");
        }

        return new NasaDataContext.MissingDataReport(
                totalRecords,
                nullAnomaly,
                nullMovingAverage,
                nullTrend,
                descriptions
        );
    }

    private String buildMissingDataDescription(NasaDataContext.MissingDataReport report) {
        return String.join(". ", report.missingFieldDescriptions()) + ".";
    }

    private NasaDataContext.SonificationContext buildSonificationContext() {
        var map = sonificationMapService.getMap("global-temperature-anomaly");
        return new NasaDataContext.SonificationContext(
                map.phenomenonId(),
                map.description(),
                map.missingValue().behavior()
        );
    }

    private String buildDataLimitations(
            MonthlyFileMetadata metadata,
            boolean hasMissingData,
            boolean hasAnnualData
    ) {
        StringBuilder limitations = new StringBuilder();
        limitations.append(metadata.notes());
        if (hasMissingData) {
            limitations.append(" Missing values are preserved as null and are not estimated or interpolated.");
        }
        if (!hasAnnualData) {
            limitations.append(" No annual record available for this year.");
        }
        return limitations.toString();
    }
}
