package dev.ulloasp.mlsuite.user.exceptions;

/**
 * Exception thrown when trying to deactivate a user account that is already
 * deactivated.
 */
public class UserAlreadyDeactivatedException extends RuntimeException {

    public UserAlreadyDeactivatedException() {
        super("User account is already deactivated.");
    }
}
