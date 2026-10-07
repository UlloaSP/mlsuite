package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

import jakarta.annotation.Nullable;

/**
 * {@code exampleCount} is the marked runs of the pinned snapshot, served while the bookmark is
 * public; {@code staleExampleCount} is the marked runs it left behind when it moved, never served.
 */
public record SchemaBookmarkDto(
        Long id,
        Long schemaId,
        String schemaName,
        Long versionId,
        int version,
        @Nullable String versionName,
        String name,
        @Nullable String description,
        BookmarkVisibility visibility,
        @Nullable String publicId,
        long exampleCount,
        long staleExampleCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    /** {@code exampleCounts} is keyed by bookmark id; a bookmark it does not name has no examples. */
    public static SchemaBookmarkDto from(SchemaBookmark bookmark, Map<Long, BookmarkExampleCounts> exampleCounts) {
        BookmarkExampleCounts examples = exampleCounts.getOrDefault(bookmark.getId(), BookmarkExampleCounts.NONE);
        return new SchemaBookmarkDto(
                bookmark.getId(),
                bookmark.getSchema().getId(),
                bookmark.getSchema().getName(),
                bookmark.getVersion().getId(),
                bookmark.getVersion().getVersion(),
                bookmark.getVersion().getName(),
                bookmark.getName(),
                bookmark.getDescription(),
                bookmark.getVisibility(),
                bookmark.getPublicId(),
                examples.current(),
                examples.stale(),
                bookmark.getCreatedAt(),
                bookmark.getUpdatedAt());
    }
}
