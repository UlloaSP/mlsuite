package dev.ulloasp.mlsuite.security.tenant;

public class OrganizationAccessDeniedException extends RuntimeException {

    public OrganizationAccessDeniedException(String slug) {
        super("User does not have access to organization '" + slug + "'");
    }
}
