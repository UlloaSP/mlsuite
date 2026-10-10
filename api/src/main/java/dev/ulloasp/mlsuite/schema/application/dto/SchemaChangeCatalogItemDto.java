package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.annotation.Nullable;

/** An open change with the name of the snapshot it started from. */
public record SchemaChangeCatalogItemDto(SchemaDraftDto draft, @Nullable String baseSnapshotName) {
}
