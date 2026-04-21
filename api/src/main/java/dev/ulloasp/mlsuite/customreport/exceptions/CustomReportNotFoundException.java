package dev.ulloasp.mlsuite.customreport.exceptions;

public class CustomReportNotFoundException extends RuntimeException {

    public CustomReportNotFoundException(String id) {
        super("Custom report with ID '" + id + "' does not exist.");
    }
}
