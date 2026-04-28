package dev.ulloasp.mlsuite.organization.domain.exception;

public class OrganizationNotFoundException extends RuntimeException {

    public OrganizationNotFoundException(Long organizationId) {
        super("Organization '" + organizationId + "' does not exist.");
    }
}
