package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateSchemaModelBindingRequest(
        @NotNull @Positive Long modelId,
        @NotNull @Positive Long signatureId,
        Map<String, Object> inputMapping,
        Map<String, Object> outputMapping,
        Map<String, Object> pluginPolicy) {
}
