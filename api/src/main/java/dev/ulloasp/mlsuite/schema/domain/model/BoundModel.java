package dev.ulloasp.mlsuite.schema.domain.model;

import jakarta.annotation.Nullable;

/** A model bound to a snapshot, read without its artifact: who it is and how large it is. */
public record BoundModel(Long id, String name, @Nullable Long sizeBytes) {
}
