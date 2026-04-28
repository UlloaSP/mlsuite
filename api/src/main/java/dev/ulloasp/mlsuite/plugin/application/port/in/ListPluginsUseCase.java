package dev.ulloasp.mlsuite.plugin.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;

public interface ListPluginsUseCase {

    List<PluginDto> list(Long userId);
}
