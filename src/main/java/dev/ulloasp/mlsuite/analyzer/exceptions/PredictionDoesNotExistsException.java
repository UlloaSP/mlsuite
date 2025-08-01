package dev.ulloasp.mlsuite.analyzer.exceptions;

public class PredictionDoesNotExistsException extends RuntimeException {

    public PredictionDoesNotExistsException(Long predictionId, String userDisplayName) {
        super("Prediction with ID '" + predictionId + "' does not exist for user: " + userDisplayName);
    }

}
