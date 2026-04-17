package dev.ulloasp.mlsuite.customexplanation.exceptions;

public class CustomExplanationNotFoundException extends RuntimeException {

    public CustomExplanationNotFoundException(String id) {
        super("Custom explanation with ID '" + id + "' does not exist.");
    }
}
