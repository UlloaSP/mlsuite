package dev.ulloasp.mlsuite.user.exceptions;

/**
 * Exception thrown when trying to activate a user account that is already
 * active.
 */
public class UserAlreadyActiveException extends RuntimeException {

    public UserAlreadyActiveException() {
        super("User account is already active.");
    }
}
