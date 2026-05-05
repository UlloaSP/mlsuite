/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.user.domain.model.User;
public record OutputFeedbackDto(
        Long id,
        Long predictionId,
        Long userId,
        String userName,
        String userEmail,
        int order,
        JsonNode value,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static OutputFeedbackDto toDto(OutputFeedback outputFeedback) {
        User user = outputFeedback.getUser();
        return new OutputFeedbackDto(
                outputFeedback.getId(),
                outputFeedback.getPrediction().getId(),
                user == null ? null : user.getId(),
                user == null ? null : user.getFullName(),
                user == null ? null : user.getEmail(),
                outputFeedback.getOrder(),
                outputFeedback.getValue(),
                outputFeedback.getCreatedAt(),
                outputFeedback.getUpdatedAt());
    }

    public static List<OutputFeedbackDto> toDtoList(List<OutputFeedback> outputFeedback) {
        return outputFeedback.stream().map(OutputFeedbackDto::toDto).toList();
    }
}

