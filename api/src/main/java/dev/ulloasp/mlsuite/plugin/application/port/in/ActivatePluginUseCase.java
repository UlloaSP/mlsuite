package dev.ulloasp.mlsuite.plugin.application.port.in;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;

public interface ActivatePluginUseCase {

    PluginDto activate(Long userId, String id);
}
