package dev.ulloasp.mlsuite.organization.application.dto;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.user.application.dto.UserAvatarUrl;

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
        @Nullable String updatedByEmail,
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
        Principal modifier = organization.getUpdatedBy();
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
                modifier.label(),
                modifier.email(),
                modifier.userId() == null ? null : UserAvatarUrl.of(modifier.userId(), modifier.getUserAvatarUpdatedAt()),
                modelCount,
                schemaCount,
                pluginCount,
                inferenceCount,
                memberCount);
    }
}
