/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public record TraceRequest(
        @NotBlank String text,
        @NotBlank String feature,
        String targetClass,
        List<@Valid ConditionRequest> conditions) {

    public TraceRequest {
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
    }
}

