package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.domain.model.User;

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
        String updatedByName,
        String updatedByEmail,
        String updatedByAvatarUrl,
        long teamCount,
        long modelCount,
        long schemaCount,
        long pluginCount,
        long inferenceCount,
        boolean publicAccess,
        long memberCount) {

    public static OrganizationCatalogItemDto from(
            Organization organization,
            String ownerName,
            String ownerEmail,
            String ownerAvatarUrl,
            long teamCount,
            long modelCount,
            long schemaCount,
            long pluginCount,
            long inferenceCount,
            boolean publicAccess,
            long memberCount) {
        User modifier = organization.getUpdatedBy() == null ? organization.getCreatedBy() : organization.getUpdatedBy();
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
                modifier == null ? null : modifier.getFullName(),
                modifier == null ? null : modifier.getEmail(),
                modifier == null ? null : modifier.getAvatarUrl(),
                teamCount,
                modelCount,
                schemaCount,
                pluginCount,
                inferenceCount,
                publicAccess,
                memberCount);
    }
}
