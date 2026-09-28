package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotBlank;

public record CreateSchemaRequest(
        @NotBlank String name,
        @Nullable String description) {
}
