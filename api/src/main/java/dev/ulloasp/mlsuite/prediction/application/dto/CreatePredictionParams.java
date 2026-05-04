/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreatePredictionParams(
        @NotNull @Positive Long signatureId,
        @NotBlank String name,
        boolean overwrite,
        @NotEmpty Map<String, Object> inputs,
        @NotEmpty Map<String, Object> prediction) {
}

