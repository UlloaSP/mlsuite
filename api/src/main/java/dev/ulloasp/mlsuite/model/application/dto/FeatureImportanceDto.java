/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

/** How much a model leans on one feature, as its bundle's structure states it. */
public record FeatureImportanceDto(String feature, double importance) {
}
