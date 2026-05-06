/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import dev.ulloasp.mlsuite.model.domain.model.Model;
public record ModelDto(
        Long id,
        String name,
        String type,
        String specificType,
        String fileName,
        OffsetDateTime createdAt) {

    public static final ModelDto toDto(Model model) {
        return new ModelDto(
                model.getId(),
                model.getName(),
                model.getType(),
                model.getSpecificType(),
                model.getFileName(),
                model.getCreatedAt());
    }

    public static final List<ModelDto> toDtoList(List<Model> models) {
        return models.stream()
                .map(ModelDto::toDto)
                .toList();
    }
}

