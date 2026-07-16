package dev.ulloasp.mlsuite.schema.application.dto;

public record SchemaDraftChangeDto(
        String path,
        Object baseValue,
        Object draftValue,
        Object currentValue,
        boolean basePresent,
        boolean draftPresent,
        boolean currentPresent,
        boolean draftChanged,
        boolean conflict) {
}
