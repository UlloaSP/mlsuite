package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.domain.model.User;

import jakarta.annotation.Nullable;

public record OrganizationCatalogItemDto(
        Long id,
        String slug,
        String name,
        @Nullable String description,
        @Nullable String logoUrl,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        @Nullable String ownerName,
        @Nullable String ownerEmail,
        @Nullable String ownerAvatarUrl,
        String updatedByName,
        String updatedByEmail,
        @Nullable String updatedByAvatarUrl,
        long modelCount,
        long schemaCount,
        long pluginCount,
        long inferenceCount,
        long memberCount) {

    public static OrganizationCatalogItemDto from(
            Organization organization,
            String ownerName,
            String ownerEmail,
            String ownerAvatarUrl,
            long modelCount,
            long schemaCount,
            long pluginCount,
            long inferenceCount,
            long memberCount) {
        User modifier = organization.getUpdatedBy() == null ? organization.getCreatedBy() : organization.getUpdatedBy();
        return new OrganizationCatalogItemDto(
                organization.getId(),
                organization.getSlug(),
                organization.getName(),
                organization.getDescription(),
                OrganizationLogoUrl.of(organization),
                organization.getCreatedAt(),
                organization.getUpdatedAt(),
                ownerName,
                ownerEmail,
                ownerAvatarUrl,
                modifier == null ? null : modifier.getFullName(),
                modifier == null ? null : modifier.getEmail(),
                modifier == null ? null : modifier.getAvatarUrl(),
                modelCount,
                schemaCount,
                pluginCount,
                inferenceCount,
                memberCount);
    }
}
