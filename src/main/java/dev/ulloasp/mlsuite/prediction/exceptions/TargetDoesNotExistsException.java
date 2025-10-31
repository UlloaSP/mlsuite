package dev.ulloasp.mlsuite.prediction.exceptions;

public class TargetDoesNotExistsException extends RuntimeException {

    public TargetDoesNotExistsException(Long targetId, String userDisplayName) {
        super("Target with ID '" + targetId + "' does not exist for user: " + userDisplayName);
    }

}
