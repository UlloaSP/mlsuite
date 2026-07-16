package dev.ulloasp.mlsuite.plugin.application.dto;

import java.time.OffsetDateTime;

public record PluginDto(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String updatedByName,
        String updatedByEmail,
        String updatedByAvatarUrl,
        String source,
        String pluginType,
        String kind) {
}

