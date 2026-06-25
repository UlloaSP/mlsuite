package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

public record OrganizationCatalogItemDto(
        Long id,
        String slug,
        String name,
        String description,
        String avatarUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String ownerName,
        String ownerEmail,
        String ownerAvatarUrl,
        long modelCount,
        long schemaCount,
        long pluginCount,
        long memberCount) {

    public static OrganizationCatalogItemDto from(
            Organization organization,
            String ownerName,
            String ownerEmail,
            String ownerAvatarUrl,
            long modelCount,
            long schemaCount,
            long pluginCount,
            long memberCount) {
        return new OrganizationCatalogItemDto(
                organization.getId(),
                organization.getSlug(),
                organization.getName(),
                organization.getDescription(),
                organization.getAvatarUrl(),
                organization.getCreatedAt(),
                organization.getUpdatedAt(),
                ownerName,
                ownerEmail,
                ownerAvatarUrl,
                modelCount,
                schemaCount,
                pluginCount,
                memberCount);
    }
}
