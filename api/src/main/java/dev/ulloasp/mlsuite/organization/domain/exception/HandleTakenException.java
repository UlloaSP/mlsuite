package dev.ulloasp.mlsuite.organization.domain.exception;

public class HandleTakenException extends RuntimeException {

    public HandleTakenException(String handle) {
        super("The handle '" + handle + "' is already taken.");
    }
}
