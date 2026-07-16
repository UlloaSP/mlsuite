package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateSchemaDraftRequest(
        @NotBlank String name,
        @NotNull @Positive Long baseVersionId) {
}
