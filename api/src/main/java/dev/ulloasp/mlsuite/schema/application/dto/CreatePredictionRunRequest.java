package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreatePredictionRunRequest(
        /** The snapshot the client ran; it must still be the bookmark's target when saving. */
        @NotNull Long schemaVersionId,
        @NotBlank String name,
        @NotEmpty Map<String, Object> inputData,
        @NotEmpty List<@Valid CreatePredictionResultRequest> results) {
}
