package dev.ulloasp.mlsuite.schema.application.dto;

public record SchemaDraftChangeDto(
        String path,
        Object baseValue,
        Object draftValue,
        Object currentValue,
        boolean conflict) {
}
