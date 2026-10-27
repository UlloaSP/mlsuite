package dev.ulloasp.mlsuite.schema.job;

import java.time.OffsetDateTime;

import jakarta.annotation.Nullable;

/** A bulk job's progress: its rows stored as runs, failed with a reason, or still to run. */
public record PredictionJobDto(
        Long id,
        Long bookmarkId,
        Long schemaVersionId,
        PredictionJobStatus status,
        int totalRows,
        int doneRows,
        int failedRows,
        int pendingRows,
        @Nullable String createdByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        @Nullable OffsetDateTime finishedAt) {
}
