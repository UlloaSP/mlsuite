package dev.ulloasp.mlsuite.plugin.application.port.in;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginPageDto;

public interface ListPluginsUseCase {

    PluginPageDto list(Long userId, int page, int size, String type, String search, String sort);
}
