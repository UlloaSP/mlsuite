/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import dev.ulloasp.mlsuite.model.domain.model.Model;

public record CreateModelDto(
        ModelDto model) {

    public static final CreateModelDto toDto(Model model) {
        return new CreateModelDto(ModelDto.toDto(model));
    }
}

