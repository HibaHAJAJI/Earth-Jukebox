package org.example.service;

import org.example.data.AnnualDatasetFile;
import org.example.data.MonthlyDatasetFile;
import org.example.data.ResourcePhenomenonDataRepository;
import org.example.dto.AnnualTemperatureDTO;
import org.example.dto.TemperatureDTO;
import org.example.exception.InvalidQueryException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Retrieves NASA GISTEMP v4 temperature anomaly records for explanation contexts.
 *
 * <p>Supports retrieval by single year or by a single period (YYYY-YYYY).
 * For comparison scenarios, call retrieveByPeriod once per period to keep
 * the two datasets separate. Preserves original values and metadata; never
 * replaces null with zero; never sends entire datasets.
 */
@Service
public class NasaDataRetrievalService {

    private static final Pattern PERIOD_PATTERN = Pattern.compile("^\\d{4}-\\d{4}$");

    private final ResourcePhenomenonDataRepository repository;

    public NasaDataRetrievalService(ResourcePhenomenonDataRepository repository) {
        this.repository = repository;
    }

    /**
     * Retrieves all NASA records for a single year.
     *
     * @param year the year to retrieve (must be >= 1880)
     * @return monthly records for the year and the annual record if available
     * @throws InvalidQueryException if year is null or below 1880
     */
    public YearData retrieveByYear(Integer year) {
        if (year == null) {
            throw new InvalidQueryException("Year is required");
        }
        if (year < 1880) {
            throw new InvalidQueryException("Year must be >= 1880");
        }

        MonthlyDatasetFile monthlyDataset = repository.monthlyDataset();
        AnnualDatasetFile annualDataset = repository.annualDataset();

        List<TemperatureDTO> monthlyRecords = monthlyDataset.data().stream()
                .filter(record -> record.year().equals(year))
                .collect(Collectors.toList());

        List<AnnualTemperatureDTO> annualRecords = annualDataset.data().stream()
                .filter(record -> record.year().equals(year))
                .collect(Collectors.toList());

        return new YearData(year, monthlyRecords, annualRecords);
    }

    /**
     * Retrieves NASA monthly records for a single period (YYYY-YYYY).
     *
     * <p>For comparison scenarios, call this method once per period to keep
     * the two datasets separate. Do not merge periods into one continuous range.
     *
     * @param period the period in YYYY-YYYY format
     * @return monthly records within the period range
     * @throws InvalidQueryException if format is invalid or no data exists
     */
    public PeriodData retrieveByPeriod(String period) {
        validatePeriodFormat(period, "period");

        int startYear = Integer.parseInt(period.substring(0, 4));
        int endYear = Integer.parseInt(period.substring(5, 9));

        MonthlyDatasetFile monthlyDataset = repository.monthlyDataset();
        List<TemperatureDTO> monthlyRecords = monthlyDataset.data().stream()
                .filter(record -> record.year() >= startYear && record.year() <= endYear)
                .collect(Collectors.toList());

        if (monthlyRecords.isEmpty()) {
            throw new InvalidQueryException(
                    "No NASA data available for period " + period
            );
        }

        return new PeriodData(period, monthlyRecords);
    }

    /**
     * Retrieves NASA records for two separate periods, keeping them distinct.
     *
     * @param firstPeriod  first period in YYYY-YYYY format
     * @param secondPeriod second period in YYYY-YYYY format
     * @return both period datasets as separate records
     * @throws InvalidQueryException if either period is invalid or has no data
     */
    public TwoPeriodData retrieveTwoPeriods(String firstPeriod, String secondPeriod) {
        PeriodData first = retrieveByPeriod(firstPeriod);
        PeriodData second = retrieveByPeriod(secondPeriod);
        return new TwoPeriodData(first, second);
    }

    private static void validatePeriodFormat(String period, String parameter) {
        if (!PERIOD_PATTERN.matcher(period).matches()) {
            throw new InvalidQueryException(
                    parameter + " must be in YYYY-YYYY format, got: " + period
            );
        }
    }

    /**
     * Result of a single-year retrieval. Contains monthly records and,
     * when available, the annual record for the same year.
     */
    public record YearData(
            Integer year,
            List<TemperatureDTO> monthlyRecords,
            List<AnnualTemperatureDTO> annualRecords
    ) {
    }

    /**
     * Result of a single-period retrieval. Contains monthly records within the period.
     * Never merged with another period.
     */
    public record PeriodData(
            String period,
            List<TemperatureDTO> monthlyRecords
    ) {
    }

    /**
     * Result of a two-period retrieval. Keeps the two datasets strictly separate.
     */
    public record TwoPeriodData(
            PeriodData firstPeriod,
            PeriodData secondPeriod
    ) {
    }
}
