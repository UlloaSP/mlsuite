package dev.ulloasp.mlsuite.auth.exceptions;

public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String email) {
        super("User already exists with email '" + email + "'");
    }
}
