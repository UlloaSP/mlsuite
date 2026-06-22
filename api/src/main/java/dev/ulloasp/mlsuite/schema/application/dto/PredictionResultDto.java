package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;

public record PredictionResultDto(
        Long id,
        Long runId,
        Long modelId,
        Map<String, Object> modelInput,
        Map<String, Object> output,
        PredictionResultStatus status,
        String errorMessage,
        Map<String, Object> errorJson,
        OffsetDateTime createdAt) {

    public static PredictionResultDto from(PredictionResult result) {
        return new PredictionResultDto(
                result.getId(),
                result.getRun().getId(),
                result.getModel().getId(),
                result.getModelInput(),
                result.getOutput(),
                result.getStatus(),
                result.getErrorMessage(),
                result.getErrorJson(),
                result.getCreatedAt());
    }

    public static List<PredictionResultDto> fromList(List<PredictionResult> results) {
        return results.stream().map(PredictionResultDto::from).toList();
    }
}
