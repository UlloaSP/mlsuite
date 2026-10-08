package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

import jakarta.annotation.Nullable;

public record OrganizationDto(
        Long id,
        String slug,
        String name,
        @Nullable String description,
        /** Where its logo is read from, or null while it has none. */
        @Nullable String logoUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static OrganizationDto from(Organization organization) {
        return new OrganizationDto(
                organization.getId(),
                organization.getSlug(),
                organization.getName(),
                organization.getDescription(),
                OrganizationLogoUrl.of(organization),
                organization.getCreatedAt(),
                organization.getUpdatedAt());
    }
}
