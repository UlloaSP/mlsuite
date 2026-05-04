/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.application.dto;

import java.util.Map;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
public record CreateSignatureParams(
        @NotNull @Positive Long modelId,
        @NotBlank String name,
        @NotEmpty Map<String, Object> inputSignature,
        @PositiveOrZero int major,
        @PositiveOrZero int minor,
        @PositiveOrZero int patch,
        @Nullable Long origin) {
}

