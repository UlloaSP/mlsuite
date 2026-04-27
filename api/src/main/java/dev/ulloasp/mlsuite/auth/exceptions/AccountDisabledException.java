package dev.ulloasp.mlsuite.auth.exceptions;

public class AccountDisabledException extends RuntimeException {
    public AccountDisabledException() {
        super("Account is disabled or locked");
    }
}
