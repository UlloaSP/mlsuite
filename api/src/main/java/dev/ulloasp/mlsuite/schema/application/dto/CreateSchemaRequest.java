package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateSchemaRequest(
        @NotBlank String name,
        String description) {
}
