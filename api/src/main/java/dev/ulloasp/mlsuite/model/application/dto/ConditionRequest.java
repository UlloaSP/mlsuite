/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import jakarta.validation.constraints.NotBlank;

public record ConditionRequest(
        @NotBlank String operator,
        @NotBlank String value) {
}

