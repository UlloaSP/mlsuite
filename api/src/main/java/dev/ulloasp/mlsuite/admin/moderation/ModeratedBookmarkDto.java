package dev.ulloasp.mlsuite.admin.moderation;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

import jakarta.annotation.Nullable;

/**
 * A bookmark flagged public, as a platform moderator sees it. {@code schemaArchived} marks the
 * ones whose public page answers 404 although they are still public in the database.
 */
public record ModeratedBookmarkDto(
        Long id,
        String name,
        String schemaName,
        boolean schemaArchived,
        String organizationName,
        int version,
        @Nullable String versionName,
        String publicId,
        OffsetDateTime updatedAt) {

    public static ModeratedBookmarkDto from(SchemaBookmark bookmark) {
        Schema schema = bookmark.getSchema();
        SchemaVersion version = bookmark.getVersion();
        return new ModeratedBookmarkDto(
                bookmark.getId(),
                bookmark.getName(),
                schema.getName(),
                schema.getArchivedAt() != null,
                schema.getOrganization().getName(),
                version.getVersion(),
                version.getName(),
                bookmark.getPublicId(),
                bookmark.getUpdatedAt());
    }
}
