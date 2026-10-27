package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import jakarta.annotation.Nullable;

/**
 * A prediction the server performed, as a saved run will store it, and its seal. Saving the run
 * sends back only {@code attestation}; the other fields are for showing the result meanwhile.
 */
public record WorkspacePredictionDto(
        Long modelId,
        Map<String, Object> modelInput,
        Map<String, Object> output,
        PredictionResultStatus status,
        @Nullable String errorMessage,
        @Nullable Map<String, Object> errorJson,
        String attestation) {
}
