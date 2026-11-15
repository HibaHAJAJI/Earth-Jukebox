package org.example.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.dto.NasaDataContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * OpenAI implementation of {@link ExplanationProvider}.
 *
 * <p>Uses {@code java.net.http.HttpClient} with no additional dependencies.
 * Reads the API key from {@code OPENAI_API_KEY} environment variable via
 * {@code openai.api.key} property. Application starts even if the key is missing;
 * {@link #isAvailable()} returns {@code false} in that case.
 */
@Service
public class OpenAiExplanationProvider implements ExplanationProvider {

    private static final String MODEL = "gpt-4o-mini";
    private static final int MAX_TOKENS = 150;
    private static final double TEMPERATURE = 0.0;
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public OpenAiExplanationProvider(
            @Value("${openai.api.key:}") String apiKey,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(TIMEOUT)
                .build();
    }

    @Override
    public String getName() {
        return "openai";
    }

    @Override
    public boolean isAvailable() {
        return !apiKey.isEmpty();
    }

    @Override
    public String explain(NasaDataContext context, String language, boolean narration) {
        if (!isAvailable()) {
            throw new IllegalStateException("OpenAI API key is not configured");
        }

        String systemPrompt = buildSystemPrompt(language, narration);
        String userPrompt = buildUserPrompt(context, language);

        try {
            String requestBody = buildRequestBody(systemPrompt, userPrompt, narration);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(TIMEOUT)
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException(
                        "OpenAI API returned status " + response.statusCode() + ": " + response.body()
                );
            }

            return extractContent(response.body());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("OpenAI request interrupted", e);
        } catch (Exception e) {
            throw new RuntimeException("OpenAI provider failed", e);
        }
    }

    private String buildSystemPrompt(String language, boolean narration) {
        String languageInstruction;
        if ("fr".equals(language)) {
            languageInstruction = " Respond ONLY in French. ";
        } else if ("ar".equals(language)) {
            languageInstruction = " Respond ONLY in Arabic. ";
        } else {
            languageInstruction = " Respond ONLY in English. ";
        }

        if (narration) {
            return "You are Earth Jukebox AI Explainer. "
                    + languageInstruction
                    + "Use ONLY the supplied NASA_DATA_CONTEXT. "
                    + "Never invent measurements, causes, forecasts, or conclusions. "
                    + "Never replace null values with zero. "
                    + "Maximum 30 words. Suitable for text-to-speech narration. No markdown.";
        }
        return "You are Earth Jukebox AI Explainer. "
                + languageInstruction
                + "Use ONLY the supplied NASA_DATA_CONTEXT. "
                + "Structure your response as FACTS, STATISTICS, INTERPRETATION, LIMITATIONS, DATA SOURCE. "
                + "Never invent measurements, causes, forecasts, or conclusions. "
                + "Never replace null values with zero. "
                + "Never claim a statistical calculation was performed unless supplied in the context. "
                + "Never make climate predictions. "
                + "Maximum 80 words. Suitable for text-to-speech narration. No markdown.";
    }

    private String buildUserPrompt(NasaDataContext context, String language) {
        String languageLabel;
        if ("fr".equals(language)) {
            languageLabel = "Langue";
        } else if ("ar".equals(language)) {
            languageLabel = "\u0627\u0644\u0644\u063a\u0629";
        } else {
            languageLabel = "Language";
        }
        String explainPrompt;
        if ("fr".equals(language)) {
            explainPrompt = " Expliquez ce que l'utilisateur voit et entend.";
        } else if ("ar".equals(language)) {
            explainPrompt = "\u0627\u0634\u0631\u062d \u0645\u0627 \u064a\u0631\u0627\u0647 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0648\u064a\u0633\u0645\u0639\u0647.";
        } else {
            explainPrompt = " Explain what the user is seeing and hearing.";
        }

        return "NASA_DATA_CONTEXT: "
                + "datasetSource=" + context.datasetSource() + ", "
                + "yearsUsed=" + context.yearsUsed() + ", "
                + "unit=" + context.unit() + ", "
                + "retrievedFacts=" + context.retrievedFacts() + ", "
                + "calculatedStatistics=" + context.calculatedStatistics() + ", "
                + "sonificationContext=" + context.sonificationContext() + ", "
                + "hasMissingData=" + context.hasMissingData() + ", "
                + "missingDataDescription=" + context.missingDataDescription() + ", "
                + "dataLimitations=" + context.dataLimitations()
                + ". " + languageLabel + ": " + language + ". " + explainPrompt;
    }

    private String buildRequestBody(String systemPrompt, String userPrompt, boolean narration) throws Exception {
        Map<String, Object> systemMessage = Map.of("role", "system", "content", systemPrompt);
        Map<String, Object> userMessage = Map.of("role", "user", "content", userPrompt);
        Map<String, Object> body = Map.of(
                "model", MODEL,
                "messages", List.of(systemMessage, userMessage),
                "max_tokens", narration ? 60 : MAX_TOKENS,
                "temperature", TEMPERATURE
        );
        return objectMapper.writeValueAsString(body);
    }

    private String extractContent(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode choices = root.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("OpenAI response has no choices");
        }
        JsonNode message = choices.get(0).get("message");
        if (message == null) {
            throw new RuntimeException("OpenAI response has no message");
        }
        JsonNode content = message.get("content");
        if (content == null) {
            throw new RuntimeException("OpenAI response has no content");
        }
        return content.asText();
    }
}
