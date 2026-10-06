package dev.ulloasp.mlsuite.schema.application.dto;

import dev.ulloasp.mlsuite.schema.domain.model.BookmarkExampleStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;

import jakarta.annotation.Nullable;

/** A marked run as the workspace shows it: which run, the snapshot it ran on, and whether it is served. */
public record SchemaBookmarkExampleDto(
        Long runId,
        String runName,
        int runVersion,
        @Nullable String runVersionName,
        BookmarkExampleStatus status) {

    public static SchemaBookmarkExampleDto from(SchemaBookmarkExample example) {
        PredictionRun run = example.getRun();
        return new SchemaBookmarkExampleDto(
                run.getId(),
                run.getName(),
                run.getSchemaVersion().getVersion(),
                run.getSchemaVersion().getName(),
                example.status());
    }
}
