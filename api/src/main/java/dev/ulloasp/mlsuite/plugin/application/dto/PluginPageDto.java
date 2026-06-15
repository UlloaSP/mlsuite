package dev.ulloasp.mlsuite.plugin.application.dto;

import java.util.List;

public record PluginPageDto(
        List<PluginDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext) {
}
