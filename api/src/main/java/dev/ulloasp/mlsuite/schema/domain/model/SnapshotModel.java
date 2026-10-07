package dev.ulloasp.mlsuite.schema.domain.model;

import jakarta.annotation.Nullable;

/** A model bound to one of several snapshots read together, with the snapshot it belongs to. */
public record SnapshotModel(Long schemaVersionId, BoundModel model) {

    public SnapshotModel(Long schemaVersionId, Long id, String name, @Nullable Long sizeBytes) {
        this(schemaVersionId, new BoundModel(id, name, sizeBytes));
    }
}
