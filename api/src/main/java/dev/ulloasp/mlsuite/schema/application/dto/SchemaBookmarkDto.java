package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public record SchemaBookmarkDto(
        Long id,
        Long schemaId,
        Long versionId,
        int version,
        String versionName,
        String name,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static SchemaBookmarkDto from(SchemaBookmark bookmark) {
        return new SchemaBookmarkDto(
                bookmark.getId(),
                bookmark.getSchema().getId(),
                bookmark.getVersion().getId(),
                bookmark.getVersion().getVersion(),
                bookmark.getVersion().getName(),
                bookmark.getName(),
                bookmark.getCreatedAt(),
                bookmark.getUpdatedAt());
    }
}
