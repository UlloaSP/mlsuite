package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

public record CatalogSelectionPageDto(
        List<CatalogSelectionItemDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext,
        long totalAvailable) {
}
