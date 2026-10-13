/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import jakarta.annotation.Nullable;

/**
 * What a model's bundle says about it: its manifest as uploaded, the feature importances read
 * from its structure (none for a model without one), and the stored artifact's size and hash.
 */
public record ModelDetailsDto(
        Map<String, Object> manifest,
        @Nullable List<FeatureImportanceDto> featureImportances,
        @Nullable Long sizeBytes,
        @Nullable String sha256) {

    public static ModelDetailsDto toDto(Model model) {
        return new ModelDetailsDto(
                model.getBundleManifest(),
                model.getFeatureImportances() == null ? null : model.getFeatureImportances().stream()
                        .filter(item -> item.get("feature") instanceof String && item.get("importance") instanceof Number)
                        .map(item -> new FeatureImportanceDto(
                                (String) item.get("feature"), ((Number) item.get("importance")).doubleValue()))
                        .toList(),
                model.getModelSizeBytes(),
                model.getArtifactSha256());
    }
}
