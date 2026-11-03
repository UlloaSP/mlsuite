package dev.ulloasp.mlsuite.schema.application.dto;

import tools.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UpdatePredictionResultFeedbackRequest(
        @NotNull @Positive Long feedbackId,
        @NotNull JsonNode value) {
}
