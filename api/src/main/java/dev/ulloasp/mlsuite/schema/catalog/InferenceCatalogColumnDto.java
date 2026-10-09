package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

public record InferenceCatalogColumnDto(
        String id,
        InferenceColumnGroup group,
        String label,
        Long schemaId,
        String schemaName,
        InferenceValueKind kind,
        List<String> choices) {
}
