package dev.ulloasp.mlsuite.plugin.application.dto;

import java.time.OffsetDateTime;

import jakarta.annotation.Nullable;

public record PluginDto(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        @Nullable String updatedByName,
        @Nullable String updatedByEmail,
        @Nullable String updatedByAvatarUrl,
        String source,
        String pluginType,
        @Nullable String kind) {
}

