package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreatePredictionResultRequest(
        @NotNull @Positive Long modelId,
        @NotNull @Positive Long signatureId,
        Map<String, Object> modelInput,
        Map<String, Object> output,
        @NotNull PredictionResultStatus status,
        String errorMessage,
        Map<String, Object> errorJson) {
}
