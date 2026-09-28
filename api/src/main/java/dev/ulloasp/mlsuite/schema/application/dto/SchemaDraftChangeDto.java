package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.annotation.Nullable;

public record SchemaDraftChangeDto(
        String path,
        @Nullable Object baseValue,
        @Nullable Object draftValue,
        @Nullable Object currentValue,
        boolean basePresent,
        boolean draftPresent,
        boolean currentPresent,
        boolean draftChanged,
        boolean conflict) {
}
