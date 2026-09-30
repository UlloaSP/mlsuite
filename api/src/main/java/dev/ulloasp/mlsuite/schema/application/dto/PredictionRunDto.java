package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;

import jakarta.annotation.Nullable;

public record PredictionRunDto(
        Long id,
        Long schemaVersionId,
        @Nullable Long schemaBookmarkId,
        String name,
        Map<String, Object> inputData,
        PredictionRunStatus status,
        List<PredictionResultDto> results,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        @Nullable String createdByName,
        @Nullable String createdByEmail) {

    public static PredictionRunDto from(PredictionRun run, List<PredictionResult> results) {
        return new PredictionRunDto(
                run.getId(),
                run.getSchemaVersion().getId(),
                run.getSchemaBookmark() == null ? null : run.getSchemaBookmark().getId(),
                run.getName(),
                run.getInputData(),
                run.getStatus(),
                PredictionResultDto.fromList(results),
                run.getCreatedAt(),
                run.getUpdatedAt(),
                run.getCreatedByName(),
                run.getCreatedByEmail());
    }
}
