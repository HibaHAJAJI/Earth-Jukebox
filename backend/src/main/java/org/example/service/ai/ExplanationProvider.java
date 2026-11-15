package org.example.service.ai;

import org.example.dto.NasaDataContext;

/**
 * Abstraction for NASA data explanation providers (OpenAI, Gemini, Claude).
 *
 * <p>Implementations must be lazy: no network calls in constructors.
 * Missing API keys must result in {@code isAvailable() == false}, not application failure.
 * Provider failures are communicated through unchecked exceptions handled by the service layer.
 */
public interface ExplanationProvider {

    /**
     * Returns the provider name (e.g., "openai", "gemini", "claude").
     *
     * @return provider name, never null
     */
    String getName();

    /**
     * Returns {@code true} only if the provider is configured and ready to serve requests.
     * A missing API key must return {@code false}, not throw.
     *
     * @return {@code true} if available, {@code false} otherwise
     */
    boolean isAvailable();

    /**
     * Generates a TTS-ready explanation for the supplied NASA data context.
     *
     * @param context   compact NASA data context (never null)
     * @param narration if true, the response must be limited to approximately 30 words
     * @return explanation text, never null
     * @throws RuntimeException if the provider cannot fulfill the request
     */
    String explain(NasaDataContext context, boolean narration);
}
