package dev.ulloasp.mlsuite.organization.domain.exception;

/** Nobody acts in an organization that is being purged, whatever they could do there before. */
public class OrganizationPurgingException extends OrganizationAccessDeniedException {

    private final String name;

    public OrganizationPurgingException(Long organizationId, String name) {
        super(organizationId);
        this.name = name;
    }

    @Override
    public String getMessage() {
        return name + " is being deleted.";
    }
}
