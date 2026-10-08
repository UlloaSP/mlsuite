package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationLogoUrl;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

import jakarta.annotation.Nullable;

/**
 * A published bookmark as the public feed lists it: what a card shows, and nothing by internal id.
 * The schema's name, its description and the snapshot's name are the organization's own, so
 * only the bookmark's description and the size of the public form are told. The publisher is
 * named and, when it has one, its logo is linked.
 */
public record PublicBookmarkSummaryDto(
        String publicId,
        String name,
        @Nullable String description,
        int inputCount,
        int reportCount,
        String organizationName,
        @Nullable String organizationLogoUrl,
        OffsetDateTime updatedAt) {

    public static PublicBookmarkSummaryDto from(SchemaBookmark bookmark, int inputCount, int reportCount) {
        return new PublicBookmarkSummaryDto(
                bookmark.getPublicId(),
                bookmark.getName(),
                bookmark.getDescription(),
                inputCount,
                reportCount,
                bookmark.getSchema().getOrganization().getName(),
                OrganizationLogoUrl.of(bookmark.getSchema().getOrganization()),
                bookmark.getUpdatedAt());
    }
}
