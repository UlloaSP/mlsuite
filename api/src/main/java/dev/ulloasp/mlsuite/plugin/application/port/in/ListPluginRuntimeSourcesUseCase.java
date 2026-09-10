package dev.ulloasp.mlsuite.plugin.application.port.in;

import java.util.List;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;

public interface ListPluginRuntimeSourcesUseCase {
    List<PluginRuntimeSourceDto> list(Long userId);
}
