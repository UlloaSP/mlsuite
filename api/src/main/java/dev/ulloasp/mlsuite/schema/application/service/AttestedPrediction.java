package dev.ulloasp.mlsuite.schema.application.service;

import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;

/**
 * One model execution the server performed for a workspace run, exactly as the run will store
 * it: the record the model received, its answer in the stored shape, and how it ended. It names
 * the organization and snapshot it was performed for and when ({@code issuedAt}, epoch
 * milliseconds), so a sealed copy can only be saved where and while it is valid.
 */
public record AttestedPrediction(Long organizationId, Long schemaVersionId, Long modelId, Map<String, Object> modelInput,
        Map<String, Object> output, PredictionResultStatus status, String errorMessage, Map<String, Object> errorJson,
        long issuedAt) {
}
