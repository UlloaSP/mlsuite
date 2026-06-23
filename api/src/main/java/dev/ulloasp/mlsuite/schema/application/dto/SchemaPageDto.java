package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

public record SchemaPageDto(
        List<SchemaDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext) {
}
