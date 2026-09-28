package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.annotation.Nullable;

public record SchemaDraftPublishResultDto(
        String status,
        SchemaDraftDto draft,
        @Nullable SchemaVersionDto version,
        @Nullable SchemaDraftDiffDto diff) {
}
