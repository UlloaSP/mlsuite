/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.dtos;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TraceRequest {
    private String text;
    /** Feature name or "prediction" */
    private String feature;
    /** Target class label; null means trace applies to all classes */
    private String targetClass;
    private List<ConditionRequest> conditions = new ArrayList<>();
}
