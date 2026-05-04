package dev.ulloasp.mlsuite.organization.domain.exception;

public class OrganizationAccessDeniedException extends RuntimeException {

    public OrganizationAccessDeniedException(Long organizationId) {
        super("Access denied to organization '" + organizationId + "'.");
    }
}
