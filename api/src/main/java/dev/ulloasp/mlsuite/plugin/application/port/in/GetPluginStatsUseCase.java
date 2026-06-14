package dev.ulloasp.mlsuite.plugin.application.port.in;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;

public interface GetPluginStatsUseCase {

    PluginStatsDto stats(Long userId);
}
