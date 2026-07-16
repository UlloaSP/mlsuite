package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

public record SchemaPageDto(
        List<SchemaCatalogItemDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext) {
}
