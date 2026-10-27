package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePredictionResultRequest(
        /** The seal of a prediction the server performed for this snapshot (WorkspacePredictionDto). */
        @NotBlank String attestation) {
}
