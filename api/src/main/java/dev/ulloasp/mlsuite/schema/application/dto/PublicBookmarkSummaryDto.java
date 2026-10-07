package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

import jakarta.annotation.Nullable;

/**
 * A published bookmark as the public feed lists it: what a card shows, and nothing by internal id.
 * The schema's name and the snapshot's are the organization's own, so only the description and
 * the size of the public form are told.
 */
public record PublicBookmarkSummaryDto(
        String publicId,
        String name,
        @Nullable String schemaDescription,
        int inputCount,
        int reportCount,
        String organizationName,
        OffsetDateTime updatedAt) {

    public static PublicBookmarkSummaryDto from(SchemaBookmark bookmark, int inputCount, int reportCount) {
        Schema schema = bookmark.getSchema();
        return new PublicBookmarkSummaryDto(
                bookmark.getPublicId(),
                bookmark.getName(),
                schema.getDescription(),
                inputCount,
                reportCount,
                schema.getOrganization().getName(),
                bookmark.getUpdatedAt());
    }
}
