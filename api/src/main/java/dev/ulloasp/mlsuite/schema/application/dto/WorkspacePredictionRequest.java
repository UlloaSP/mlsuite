package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record WorkspacePredictionRequest(
        /** The snapshot the form was built from; it must still be the bookmark's target. */
        @NotNull Long schemaVersionId,
        /** One of the snapshot's bound models. */
        @NotNull @Positive Long modelId,
        /** The record the model receives, under its own feature names. */
        @NotNull Map<String, Object> modelInput,
        /** The form's values the record was mapped from; the saved run keeps them. */
        @NotEmpty Map<String, Object> inputData) {
}
