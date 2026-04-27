/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.dtos;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExplanationFeedbackDto {
    private Long id;
    private Long predictionId;
    private int order;
    private JsonNode value;
    private JsonNode realValue;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

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
