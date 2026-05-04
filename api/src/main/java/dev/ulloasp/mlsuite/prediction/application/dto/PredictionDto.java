/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
public record PredictionDto(
        Long id,
        Long signatureId,
        Long modelId,
        String name,
        Map<String, Object> inputs,
        Map<String, Object> prediction,
        PredictionStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static final PredictionDto toDto(Prediction prediction) {
        return new PredictionDto(
                prediction.getId(),
                prediction.getSignature().getId(),
                prediction.getSignature().getModel().getId(),
                prediction.getName(),
                prediction.getData(),
                prediction.getPrediction(),
                prediction.getStatus(),
                prediction.getCreatedAt(),
                prediction.getUpdatedAt());
    }

    public static final List<PredictionDto> toDtoList(List<Prediction> predictions) {
        return predictions.stream()
                .map(PredictionDto::toDto)
                .toList();
    }
}

