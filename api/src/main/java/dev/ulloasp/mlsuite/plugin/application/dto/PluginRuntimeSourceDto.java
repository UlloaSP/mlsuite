package dev.ulloasp.mlsuite.plugin.application.dto;

import java.time.OffsetDateTime;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;

public record PluginRuntimeSourceDto(String id, String fileName, String contentType, long sizeBytes,
        OffsetDateTime createdAt, OffsetDateTime updatedAt, String source) {
    public static PluginRuntimeSourceDto from(StoredPlugin plugin) {
        return new PluginRuntimeSourceDto(plugin.id(), plugin.fileName(), plugin.contentType(), plugin.sizeBytes(),
                plugin.createdAt(), plugin.updatedAt(), plugin.source());
    }
}
