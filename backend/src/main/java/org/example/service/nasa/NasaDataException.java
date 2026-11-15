package org.example.service.nasa;

/**
 * Exception thrown by NASA data source providers and clients.
 *
 * <p>Communicates provider failures clearly to the service layer without
 * exposing implementation details or credentials.
 */
public class NasaDataException extends RuntimeException {

    public NasaDataException(String message) {
        super(message);
    }

    public NasaDataException(String message, Throwable cause) {
        super(message, cause);
    }
}
