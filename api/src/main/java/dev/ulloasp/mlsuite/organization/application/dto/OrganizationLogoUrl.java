package dev.ulloasp.mlsuite.organization.application.dto;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.application.dto.UserAvatarUrl;

/**
 * Where the picture of an account is read from, by anyone. The path carries the time the logo was
 * last replaced, so a browser may cache it for good and a new logo is a new address. A personal
 * account has no logo: it is pictured by its owner's avatar.
 */
public final class OrganizationLogoUrl {

    private OrganizationLogoUrl() {
    }

    public static String of(Organization organization) {
        if (organization.isPersonal()) return UserAvatarUrl.of(organization.getOwnerUser());
        if (organization.getLogoUpdatedAt() == null) return null;
        return "/api/public/organizations/%d/logo?v=%d".formatted(
                organization.getId(), organization.getLogoUpdatedAt().toInstant().toEpochMilli());
    }
}
