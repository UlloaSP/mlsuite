package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import jakarta.validation.constraints.NotNull;

public record PublicPredictionRequest(
        /** The snapshot number the page rendered; the bookmark must still point to it. */
        @NotNull Integer version,
        /** The form's values under the input keys of the public form schema. */
        @NotNull Map<String, Object> values) {
}
