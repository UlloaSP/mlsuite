/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.dtos;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExplainRequest {
    /** Feature values for the instance to explain */
    private Map<String, Object> instance;
    /** Optional xclingo traces to customise explanation labels */
    private List<TraceRequest> traces = new ArrayList<>();
}
