package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSchemaBookmarkRequest(
        @NotBlank String name,
        @NotNull Long versionId) {
}
