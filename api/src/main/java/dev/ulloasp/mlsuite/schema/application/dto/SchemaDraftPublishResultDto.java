package dev.ulloasp.mlsuite.schema.application.dto;

public record SchemaDraftPublishResultDto(
        String status,
        SchemaDraftDto draft,
        SchemaVersionDto version,
        SchemaDraftDiffDto diff) {
}
