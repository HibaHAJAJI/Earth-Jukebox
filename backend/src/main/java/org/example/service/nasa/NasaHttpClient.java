package org.example.service.nasa;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Lightweight HTTP client for NASA data source access.
 *
 * <p>Uses {@code java.net.http.HttpClient} with no additional dependencies.
 * Configurable timeouts. Reads no API keys itself; callers inject keys
 * via headers as needed.
 */
@Component
public class NasaHttpClient {

    private final HttpClient httpClient;

    public NasaHttpClient(
            @Value("${nasa.http.timeout-seconds:30}") int timeoutSeconds
    ) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
    }

    /**
     * Performs a GET request and returns the response body as a string.
     *
     * @param uri      the URI to fetch (never null)
     * @param apiKey   optional API key for Authorization header (may be null)
     * @return response body string
     * @throws NasaDataException if the request fails
     */
    public String get(URI uri, String apiKey) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(uri)
                .GET();

        if (apiKey != null && !apiKey.isBlank()) {
            builder.header("Authorization", "Bearer " + apiKey);
        }

        try {
            HttpResponse<String> response = httpClient.send(
                    builder.build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() >= 400) {
                throw new NasaDataException(
                        "HTTP " + response.statusCode() + " from " + uri
                );
            }

            return response.body();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new NasaDataException("Request interrupted: " + uri, e);
        } catch (Exception e) {
            throw new NasaDataException("Request failed: " + uri, e);
        }
    }
}
