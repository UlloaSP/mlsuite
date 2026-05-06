package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

public record OrganizationDto(
        Long id,
        String slug,
        String name,
        String description,
        String avatarUrl,
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
