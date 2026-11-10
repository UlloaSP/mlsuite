package dev.ulloasp.mlsuite.schema.application.dto;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import jakarta.annotation.Nullable;
import java.util.List;

import tools.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;

public record PredictionResultFeedbackDto(
        Long id,
        Long resultId,
        /** Null when a visitor of the public page gave the feedback, or its member is gone. */
        @Nullable Long createdByUserId,
        @Nullable String createdByName,
        @Nullable String createdByEmail,
        PredictionResultFeedbackType type,
        int order,
        JsonNode value,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static PredictionResultFeedbackDto from(PredictionResultFeedback feedback) {
        Principal author = feedback.getCreatedBy();
        return new PredictionResultFeedbackDto(
                feedback.getId(),
                feedback.getResult().getId(),
                author.userId(),
                author.label(),
                author.email(),
                feedback.getType(),
                feedback.getOrder(),
                feedback.getValue(),
                feedback.getCreatedAt(),
                feedback.getUpdatedAt());
    }

    public static List<PredictionResultFeedbackDto> fromList(List<PredictionResultFeedback> feedback) {
        return feedback.stream().map(PredictionResultFeedbackDto::from).toList();
    }
}
