package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;

import jakarta.annotation.Nullable;

public record PredictionRunDto(
        Long id,
        Long schemaVersionId,
        @Nullable Long schemaBookmarkId,
        String name,
        Map<String, Object> inputData,
        PredictionRunStatus status,
        /** A public run was made on the bookmark's public page, by a visitor or a signed-in account. */
        PredictionRunOrigin origin,
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
                run.getOrigin(),
                PredictionResultDto.fromList(results),
                run.getCreatedAt(),
                run.getUpdatedAt(),
                run.getCreatedByName(),
                run.getCreatedByEmail());
    }
}
