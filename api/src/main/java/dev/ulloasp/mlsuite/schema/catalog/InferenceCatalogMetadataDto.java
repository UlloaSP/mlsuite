package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

public record InferenceCatalogMetadataDto(
        long totalItems,
        List<InferenceCatalogColumnDto> columns,
        List<Option> schemas,
        List<Option> bookmarks) {

    public record Option(String value, String label) {
    }
}
