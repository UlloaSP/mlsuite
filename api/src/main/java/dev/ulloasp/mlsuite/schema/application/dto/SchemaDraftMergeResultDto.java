package dev.ulloasp.mlsuite.schema.application.dto;

public record SchemaDraftMergeResultDto(
        SchemaDraftDto draft,
        SchemaDraftDiffDto diff) {
}
