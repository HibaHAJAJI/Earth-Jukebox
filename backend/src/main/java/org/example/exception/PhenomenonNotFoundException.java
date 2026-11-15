package org.example.exception;

public class PhenomenonNotFoundException extends RuntimeException {

    public PhenomenonNotFoundException(String id) {
        super("Unknown phenomenon id: " + id);
    }
}
