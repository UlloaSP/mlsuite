/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.dtos;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutputFeedbackDto {
    private Long id;
    private Long predictionId;
    private int order;
    private JsonNode value;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public static OutputFeedbackDto toDto(OutputFeedback outputFeedback) {
        return new OutputFeedbackDto(
                outputFeedback.getId(),
                outputFeedback.getPrediction().getId(),
                outputFeedback.getOrder(),
                outputFeedback.getValue(),
                outputFeedback.getCreatedAt(),
                outputFeedback.getUpdatedAt());
    }

    public static List<OutputFeedbackDto> toDtoList(List<OutputFeedback> outputFeedback) {
        return outputFeedback.stream().map(OutputFeedbackDto::toDto).toList();
    }
}
