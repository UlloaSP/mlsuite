/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.dtos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.Target;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TargetDto {
    private Long id;
    private Long predictionId;
    private int order;
    private JsonNode value;
    private JsonNode realValue;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

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
                .collect(Collectors.toList());
    }
}
