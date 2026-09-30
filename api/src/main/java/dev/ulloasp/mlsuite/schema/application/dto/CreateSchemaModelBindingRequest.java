package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateSchemaModelBindingRequest(
        @NotNull @Positive Long modelId,
        @Nullable Map<String, Object> pluginPolicy) {
}
