package dev.ulloasp.mlsuite.auth.exceptions;

public class UsernameAlreadyExistsException extends RuntimeException {
    public UsernameAlreadyExistsException(String username) {
        super("User already exists with username '" + username + "'");
    }
}
