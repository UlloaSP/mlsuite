package dev.ulloasp.mlsuite.organization.application.dto;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

/**
 * Where the organization's logo is read from, by anyone. The path carries the time the logo was
 * last replaced, so a browser may cache it for good and a new logo is a new address.
 */
public final class OrganizationLogoUrl {

    private OrganizationLogoUrl() {
    }

    public static String of(Organization organization) {
        if (organization.getLogoUpdatedAt() == null) return null;
        return "/api/public/organizations/%d/logo?v=%d".formatted(
                organization.getId(), organization.getLogoUpdatedAt().toInstant().toEpochMilli());
    }
}
