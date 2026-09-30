package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

import jakarta.annotation.Nullable;

public record OrganizationDto(
        Long id,
        String slug,
        String name,
        @Nullable String description,
        @Nullable String avatarUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static OrganizationDto from(Organization organization) {
        return new OrganizationDto(
                organization.getId(),
                organization.getSlug(),
                organization.getName(),
                organization.getDescription(),
                organization.getAvatarUrl(),
                organization.getCreatedAt(),
                organization.getUpdatedAt());
    }
}
