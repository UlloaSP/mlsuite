package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

import jakarta.annotation.Nullable;

/** A published bookmark as the public feed lists it: what a card shows, and nothing by internal id. */
public record PublicBookmarkSummaryDto(
        String publicId,
        String name,
        String schemaName,
        @Nullable String schemaDescription,
        int version,
        @Nullable String versionName,
        String organizationName,
        OffsetDateTime updatedAt) {

    public static PublicBookmarkSummaryDto from(SchemaBookmark bookmark) {
        Schema schema = bookmark.getSchema();
        SchemaVersion version = bookmark.getVersion();
        return new PublicBookmarkSummaryDto(
                bookmark.getPublicId(),
                bookmark.getName(),
                schema.getName(),
                schema.getDescription(),
                version.getVersion(),
                version.getName(),
                schema.getOrganization().getName(),
                bookmark.getUpdatedAt());
    }
}
