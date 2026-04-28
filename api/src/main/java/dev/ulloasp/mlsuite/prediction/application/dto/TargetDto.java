/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.Target;
public record TargetDto(
        Long id,
        Long predictionId,
        int order,
        JsonNode value,
        JsonNode realValue,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static final TargetDto toDto(Target target) {
        return new TargetDto(
                target.getId(),
                target.getPrediction().getId(),
                target.getOrder(),
                target.getValue(),
                target.getRealValue(),
                target.getCreatedAt(),
                target.getUpdatedAt());
    }

    public static final List<TargetDto> toDtoList(List<Target> targets) {
        return targets.stream()
                .map(TargetDto::toDto)
                .toList();
    }
}

