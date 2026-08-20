package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

public record PredictionRunCatalogItemDto(
        Long id,
        String name,
        PredictionRunStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        Long schemaId,
        String schemaName,
        Long schemaVersionId,
        int schemaVersion,
        String schemaVersionName,
        Long bookmarkId,
        String bookmarkName) {

    public static PredictionRunCatalogItemDto from(PredictionRun run) {
        SchemaVersion version = run.getSchemaVersion();
        SchemaBookmark bookmark = run.getSchemaBookmark();
        return new PredictionRunCatalogItemDto(run.getId(), run.getName(), run.getStatus(),
                run.getCreatedAt(), run.getUpdatedAt(), version.getSchema().getId(), version.getSchema().getName(),
                version.getId(), version.getVersion(), version.getName(),
                bookmark == null ? null : bookmark.getId(), bookmark == null ? null : bookmark.getName());
    }
}
