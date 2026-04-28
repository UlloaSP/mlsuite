/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
public record ExplanationFeedbackDto(
        Long id,
        Long predictionId,
        int order,
        JsonNode value,
        JsonNode realValue,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static ExplanationFeedbackDto toDto(ExplanationFeedback explanationFeedback) {
        return new ExplanationFeedbackDto(
                explanationFeedback.getId(),
                explanationFeedback.getPrediction().getId(),
                explanationFeedback.getOrder(),
                explanationFeedback.getValue(),
                explanationFeedback.getRealValue(),
                explanationFeedback.getCreatedAt(),
                explanationFeedback.getUpdatedAt());
    }

    public static List<ExplanationFeedbackDto> toDtoList(List<ExplanationFeedback> explanationFeedback) {
        return explanationFeedback.stream()
                .map(ExplanationFeedbackDto::toDto)
                .toList();
    }
}

