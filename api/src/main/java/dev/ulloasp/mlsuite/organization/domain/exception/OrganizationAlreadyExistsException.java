package dev.ulloasp.mlsuite.organization.domain.exception;

public class OrganizationAlreadyExistsException extends RuntimeException {

    public OrganizationAlreadyExistsException(String slug) {
        super("Organization with slug '" + slug + "' already exists.");
    }
}
