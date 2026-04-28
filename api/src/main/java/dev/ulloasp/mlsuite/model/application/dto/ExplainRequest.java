/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

public record ExplainRequest(
    @NotEmpty Map<String, Object> instance,
    List<@Valid TraceRequest> traces) {

    public ExplainRequest {
        traces = traces == null ? List.of() : List.copyOf(traces);
    }
}

