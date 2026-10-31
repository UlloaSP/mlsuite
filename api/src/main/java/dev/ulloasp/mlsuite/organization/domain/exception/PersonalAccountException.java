package dev.ulloasp.mlsuite.organization.domain.exception;

/** An operation that only makes sense for an organization people share, asked of a personal account. */
public class PersonalAccountException extends RuntimeException {

    public PersonalAccountException(String message) {
        super(message);
    }
}
