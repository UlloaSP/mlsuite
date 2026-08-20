package dev.ulloasp.mlsuite.schema.application.dto;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CreatePredictionResultInitialFeedbackRequest(
        @NotNull PredictionResultFeedbackType type,
        @PositiveOrZero int order,
        @NotNull JsonNode value) {
}
