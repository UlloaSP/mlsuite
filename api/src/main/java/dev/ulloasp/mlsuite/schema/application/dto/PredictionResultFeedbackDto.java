package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.user.domain.model.User;

public record PredictionResultFeedbackDto(
        Long id,
        Long resultId,
        Long userId,
        String userName,
        String userEmail,
        PredictionResultFeedbackType type,
        int order,
        JsonNode value,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static PredictionResultFeedbackDto from(PredictionResultFeedback feedback) {
        User user = feedback.getUser();
        return new PredictionResultFeedbackDto(
                feedback.getId(),
                feedback.getResult().getId(),
                user == null ? null : user.getId(),
                user == null ? null : user.getFullName(),
                user == null ? null : user.getEmail(),
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
