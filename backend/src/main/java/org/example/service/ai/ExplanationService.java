package org.example.service.ai;

import org.example.dto.ExplainResponse;
import org.example.dto.NasaDataContext;
import org.example.service.NasaDataRetrievalService;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Orchestrates the NASA data explanation flow:
 * retrieval -> context building -> AI provider -> structured response.
 *
 * <p>Only explains retrieved NASA data. Never uses external knowledge.
 * Never makes forecasts. Never invents scientific causes or events.
 */
@Service
public class ExplanationService {

    private final NasaDataRetrievalService retrievalService;
    private final NasaDataContextBuilder contextBuilder;
    private final OpenAiExplanationProvider provider;

    public ExplanationService(
            NasaDataRetrievalService retrievalService,
            NasaDataContextBuilder contextBuilder,
            OpenAiExplanationProvider provider
    ) {
        this.retrievalService = retrievalService;
        this.contextBuilder = contextBuilder;
        this.provider = provider;
    }

    /**
     * Builds an explanation for a single year, optionally filtered to a month.
     *
     * @param year      the year to explain (must be >= 1880)
     * @param month     optional month (1-12); if null, all months of the year are included
     * @param language  optional language code (en, fr, ar); defaults to en
     * @return structured explanation response
     */
    public ExplainResponse explain(Integer year, Integer month, String language) {
        if (year == null || year < 1880) {
            return buildErrorResponse(
                    "Year is required and must be >= 1880.",
                    year, month, language,
                    ExplainResponse.ValidationStatus.DATA_NOT_FOUND
            );
        }

        String resolvedLanguage = (language == null || language.isBlank()) ? "en" : language;

        if (!provider.isAvailable()) {
            return buildErrorResponse(
                    "No explanation provider is configured. Set OPENAI_API_KEY to enable AI explanations.",
                    year, month, resolvedLanguage,
                    ExplainResponse.ValidationStatus.DATA_NOT_FOUND
            );
        }

        NasaDataContext context = contextBuilder.buildContextForYear(year);

        // Filter to specific month if requested
        if (month != null) {
            List<NasaDataContext.NasaFact> monthlyFacts = context.retrievedFacts().stream()
                    .filter(fact -> fact.month() != null && fact.month().equals(month))
                    .toList();

            if (monthlyFacts.isEmpty()) {
                return buildErrorResponse(
                        "No NASA data found for year " + year + " month " + month + ".",
                        year, month, resolvedLanguage,
                        ExplainResponse.ValidationStatus.DATA_NOT_FOUND
                );
            }

            context = new NasaDataContext(
                    context.datasetSource(),
                    year + "-" + String.format("%02d", month),
                    context.unit(),
                    context.dataLimitations(),
                    monthlyFacts,
                    context.calculatedStatistics(),
                    context.sonificationContext(),
                    context.hasMissingData(),
                    context.missingDataDescription(),
                    context.missingDataReport()
            );
        }

        if (context.retrievedFacts().isEmpty()) {
            return buildErrorResponse(
                    "No NASA data found for year " + year + ".",
                    year, month, resolvedLanguage,
                    ExplainResponse.ValidationStatus.DATA_NOT_FOUND
            );
        }

        String explanation = provider.explain(context, resolvedLanguage, false);

        ExplainResponse.ValidationStatus status = context.hasMissingData()
                ? ExplainResponse.ValidationStatus.INSUFFICIENT_DATA
                : ExplainResponse.ValidationStatus.DATA_VALIDATED;

        String yearsCovered = (month != null)
                ? year + "-" + String.format("%02d", month)
                : String.valueOf(year);

        return new ExplainResponse(
                explanation,
                context.retrievedFacts().size() + " record(s) retrieved",
                context.datasetSource(),
                yearsCovered,
                context.unit(),
                resolvedLanguage,
                status,
                context.dataLimitations()
        );
    }

    private ExplainResponse buildErrorResponse(
            String message,
            Integer year,
            Integer month,
            String language,
            ExplainResponse.ValidationStatus status
    ) {
        String yearsCovered = (year != null && month != null)
                ? year + "-" + String.format("%02d", month)
                : (year != null ? String.valueOf(year) : "unknown");

        return new ExplainResponse(
                message,
                "No data retrieved",
                "NASA GISS GISTEMP v4",
                yearsCovered,
                "°C",
                language,
                status,
                "No NASA data available for the requested parameters."
        );
    }
}
