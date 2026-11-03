package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind;

import jakarta.annotation.Nullable;

public record OrganizationDto(
        Long id,
        String slug,
        String name,
        OrganizationKind kind,
        @Nullable String description,
        /** Where its picture is read from: its logo, or its owner's avatar; null while it has none. */
        @Nullable String logoUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static OrganizationDto from(Organization organization) {
        return new OrganizationDto(
                organization.getId(),
                organization.getSlug(),
                organization.getName(),
                organization.getKind(),
                organization.getDescription(),
                OrganizationLogoUrl.of(organization),
                organization.getCreatedAt(),
                organization.getUpdatedAt());
    }
}
