package dev.ulloasp.mlsuite.user.exceptions;

/**
 * Exception thrown when trying to create a user that already exists.
 */
public class UserAlreadyExistsException extends RuntimeException {

    public UserAlreadyExistsException(String provider, String oauthId) {
        super("User already exists with OAuth provider '" + provider + "' and ID '" + oauthId + "'");
    }
}
