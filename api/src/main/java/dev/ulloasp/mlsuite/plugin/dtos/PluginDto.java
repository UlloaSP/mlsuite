package dev.ulloasp.mlsuite.plugin.dtos;

import java.time.OffsetDateTime;

public record PluginDto(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean active,
        String source) {
}
