package dev.ulloasp.mlsuite.customfield.exceptions;

public class CustomFieldNotFoundException extends RuntimeException {

    public CustomFieldNotFoundException(String id) {
        super("Custom field with ID '" + id + "' does not exist.");
    }
}
