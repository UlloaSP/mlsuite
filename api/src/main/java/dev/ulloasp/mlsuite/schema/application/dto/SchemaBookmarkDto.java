package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

import jakarta.annotation.Nullable;

public record SchemaBookmarkDto(
        Long id,
        Long schemaId,
        String schemaName,
        Long versionId,
        int version,
        @Nullable String versionName,
        String name,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static SchemaBookmarkDto from(SchemaBookmark bookmark) {
        return new SchemaBookmarkDto(
                bookmark.getId(),
                bookmark.getSchema().getId(),
                bookmark.getSchema().getName(),
                bookmark.getVersion().getId(),
                bookmark.getVersion().getVersion(),
                bookmark.getVersion().getName(),
                bookmark.getName(),
                bookmark.getCreatedAt(),
                bookmark.getUpdatedAt());
    }
}
