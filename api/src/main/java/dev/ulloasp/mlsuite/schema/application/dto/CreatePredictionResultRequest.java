package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.Valid;

public record CreatePredictionResultRequest(
        @NotNull @Positive Long modelId,
        Map<String, Object> modelInput,
        Map<String, Object> output,
        @NotNull PredictionResultStatus status,
        String errorMessage,
        Map<String, Object> errorJson,
        List<@Valid CreatePredictionResultInitialFeedbackRequest> feedback) {

    public CreatePredictionResultRequest {
        feedback = feedback == null ? List.of() : List.copyOf(feedback);
    }

    public CreatePredictionResultRequest(Long modelId, Map<String, Object> modelInput, Map<String, Object> output,
            PredictionResultStatus status, String errorMessage, Map<String, Object> errorJson) {
        this(modelId, modelInput, output, status, errorMessage, errorJson, List.of());
    }
}
