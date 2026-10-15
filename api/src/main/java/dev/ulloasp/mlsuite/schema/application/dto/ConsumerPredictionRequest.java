package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import jakarta.validation.constraints.NotNull;

public record ConsumerPredictionRequest(
        /** One record for the bookmark's model, under the model's own feature names; each value a scalar. */
        @NotNull Map<String, Object> features) {
}
