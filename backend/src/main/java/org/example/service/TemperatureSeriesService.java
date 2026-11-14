package org.example.service;

import org.example.data.AnnualDatasetFile;
import org.example.data.MonthlyDatasetFile;
import org.example.data.MonthlyFileMetadata;
import org.example.data.ResourcePhenomenonDataRepository;
import org.example.dto.AnnualTemperatureDTO;
import org.example.dto.SeriesMetadataDTO;
import org.example.dto.SeriesResponse;
import org.example.dto.TemperatureDTO;
import org.example.exception.InvalidQueryException;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class TemperatureSeriesService {

    private static final Pattern YEAR_OR_YEAR_MONTH = Pattern.compile("^\\d{4}(-\\d{2})?$");
    private static final String MONTHLY_MISSING_POLICY = "preserved-as-null";

    private final ResourcePhenomenonDataRepository repository;
    private final PhenomenonCatalogService catalogService;

    public TemperatureSeriesService(
            ResourcePhenomenonDataRepository repository,
            PhenomenonCatalogService catalogService
    ) {
        this.repository = repository;
        this.catalogService = catalogService;
    }

    public SeriesResponse<?> getSeries(String phenomenonId, String from, String to, String resolution) {
        catalogService.requirePhenomenon(phenomenonId);
        String normalizedResolution = normalizeResolution(resolution);

        return switch (normalizedResolution) {
            case "monthly" -> monthlySeries(from, to);
            case "annual" -> annualSeries(from, to);
            default -> throw new InvalidQueryException(
                    "Unsupported resolution '" + resolution + "'. Use 'monthly' or 'annual'."
            );
        };
    }

    private SeriesResponse<TemperatureDTO> monthlySeries(String from, String to) {
        MonthlyDatasetFile dataset = repository.monthlyDataset();
        MonthlyFileMetadata metadata = dataset.metadata();
        List<TemperatureDTO> records = dataset.data();

        YearMonth datasetStart = parseYearMonth(metadata.startMonth(), "dataset start");
        YearMonth datasetEnd = parseYearMonth(metadata.endMonth(), "dataset end");
        YearMonth requestedStart = parseMonthlyBound(from, datasetStart, false, "from");
        YearMonth requestedEnd = parseMonthlyBound(to, datasetEnd, true, "to");

        validateRange(requestedStart, requestedEnd);

        List<TemperatureDTO> filtered = records.stream()
                .filter(record -> {
                    YearMonth recordMonth = YearMonth.of(record.year(), record.month());
                    return !recordMonth.isBefore(requestedStart) && !recordMonth.isAfter(requestedEnd);
                })
                .toList();

        int missingCount = (int) filtered.stream().filter(record -> record.anomaly() == null).count();
        int numericCount = filtered.size() - missingCount;

        TemperatureDTO first = filtered.isEmpty() ? null : filtered.getFirst();
        TemperatureDTO last = filtered.isEmpty() ? null : filtered.getLast();

        SeriesMetadataDTO responseMetadata = new SeriesMetadataDTO(
                PhenomenonCatalogService.TEMPERATURE_PHENOMENON_ID,
                metadata.title(),
                "monthly",
                "monthly",
                metadata.source(),
                metadata.sourceUrl(),
                metadata.unit(),
                metadata.baseline(),
                MONTHLY_MISSING_POLICY,
                metadata.dataVersion(),
                metadata.retrievedAt(),
                metadata.license(),
                Boolean.TRUE.equals(metadata.isMock()),
                requestedStart.toString(),
                requestedEnd.toString(),
                first == null ? null : YearMonth.of(first.year(), first.month()).toString(),
                last == null ? null : YearMonth.of(last.year(), last.month()).toString(),
                first == null ? null : first.year(),
                last == null ? null : last.year(),
                metadata.startYear(),
                metadata.endYear(),
                filtered.size(),
                numericCount,
                missingCount,
                "Monthly values are preserved exactly from the NASA GISTEMP v4 source. "
                        + "Missing months are null, not zero. The 2026 partial year remains monthly-only."
        );

        return new SeriesResponse<>(responseMetadata, filtered);
    }

    private SeriesResponse<AnnualTemperatureDTO> annualSeries(String from, String to) {
        AnnualDatasetFile dataset = repository.annualDataset();
        MonthlyFileMetadata monthlyMetadata = repository.monthlyDataset().metadata();
        List<AnnualTemperatureDTO> records = dataset.data();

        int datasetStartYear = records.getFirst().year();
        int datasetEndYear = records.getLast().year();
        int requestedStartYear = parseAnnualBound(from, datasetStartYear, "from");
        int requestedEndYear = parseAnnualBound(to, datasetEndYear, "to");

        if (requestedStartYear > requestedEndYear) {
            throw new InvalidQueryException(
                    "The 'from' year must be less than or equal to the 'to' year."
            );
        }

        List<AnnualTemperatureDTO> filtered = records.stream()
                .filter(record -> record.year() >= requestedStartYear && record.year() <= requestedEndYear)
                .toList();

        int missingCount = (int) filtered.stream()
                .filter(record -> record.temperature() == null)
                .count();
        int numericCount = filtered.size() - missingCount;
        long missingMovingAverages = filtered.stream()
                .filter(record -> record.movingAverage10y() == null)
                .count();

        AnnualTemperatureDTO first = filtered.isEmpty() ? null : filtered.getFirst();
        AnnualTemperatureDTO last = filtered.isEmpty() ? null : filtered.getLast();

        SeriesMetadataDTO responseMetadata = new SeriesMetadataDTO(
                PhenomenonCatalogService.TEMPERATURE_PHENOMENON_ID,
                "Global Surface Temperature Anomaly (annual)",
                "annual",
                "annual",
                dataset.source(),
                monthlyMetadata.sourceUrl(),
                dataset.unit(),
                monthlyMetadata.baseline(),
                MONTHLY_MISSING_POLICY,
                repository.annualDataVersion(),
                monthlyMetadata.retrievedAt(),
                monthlyMetadata.license(),
                Boolean.TRUE.equals(monthlyMetadata.isMock()),
                String.valueOf(requestedStartYear),
                String.valueOf(requestedEndYear),
                first == null ? null : String.valueOf(first.year()),
                last == null ? null : String.valueOf(last.year()),
                first == null ? null : first.year(),
                last == null ? null : last.year(),
                datasetStartYear,
                datasetEndYear,
                filtered.size(),
                numericCount,
                missingCount,
                "Existing annual dataset, preserved without renaming fields. "
                        + "It contains complete annual records only; 2026 is excluded because "
                        + "the annual mean is not available. "
                        + missingMovingAverages + " record(s) have a null 10-year moving average."
        );

        return new SeriesResponse<>(responseMetadata, filtered);
    }

    private static String normalizeResolution(String resolution) {
        if (resolution == null || resolution.isBlank()) {
            return "monthly";
        }
        return resolution.trim().toLowerCase(Locale.ROOT);
    }

    private static YearMonth parseMonthlyBound(
            String rawValue,
            YearMonth fallback,
            boolean endOfYear,
            String parameter
    ) {
        if (rawValue == null || rawValue.isBlank()) {
            return fallback;
        }

        String value = rawValue.trim();
        if (!YEAR_OR_YEAR_MONTH.matcher(value).matches()) {
            throw new InvalidQueryException(
                    "Invalid '" + parameter + "' value '" + rawValue
                            + "'. Use YYYY-MM (for example 2024-07) or YYYY."
            );
        }

        try {
            if (value.length() == 4) {
                return YearMonth.of(Integer.parseInt(value), endOfYear ? 12 : 1);
            }
            return YearMonth.parse(value);
        } catch (DateTimeParseException | NumberFormatException exception) {
            throw new InvalidQueryException(
                    "Invalid '" + parameter + "' value '" + rawValue + "'.", exception
            );
        }
    }

    private static int parseAnnualBound(String rawValue, int fallback, String parameter) {
        if (rawValue == null || rawValue.isBlank()) {
            return fallback;
        }

        String value = rawValue.trim();
        if (!YEAR_OR_YEAR_MONTH.matcher(value).matches()) {
            throw new InvalidQueryException(
                    "Invalid '" + parameter + "' value '" + rawValue
                            + "'. Use YYYY or YYYY-MM."
            );
        }

        try {
            String yearPart = value.length() == 4 ? value : value.substring(0, 4);
            return Integer.parseInt(yearPart);
        } catch (NumberFormatException exception) {
            throw new InvalidQueryException(
                    "Invalid '" + parameter + "' value '" + rawValue + "'.", exception
            );
        }
    }

    private static YearMonth parseYearMonth(String value, String label) {
        try {
            return YearMonth.parse(value);
        } catch (DateTimeParseException exception) {
            throw new IllegalStateException("Invalid " + label + " in dataset metadata: " + value, exception);
        }
    }

    private static void validateRange(YearMonth start, YearMonth end) {
        if (start.isAfter(end)) {
            throw new InvalidQueryException(
                    "The 'from' month must be less than or equal to the 'to' month."
            );
        }
    }
}
