package dev.ulloasp.mlsuite.user.application.dto;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationLogoUrl;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;

import jakarta.annotation.Nullable;

/** An organization on a person's profile, told by its name and its logo. */
public record PublicProfileOrganizationDto(String name, @Nullable String logoUrl) {

    public static PublicProfileOrganizationDto from(Organization organization) {
        return new PublicProfileOrganizationDto(organization.getName(), OrganizationLogoUrl.of(organization));
    }
}
