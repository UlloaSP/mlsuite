package dev.ulloasp.mlsuite.plugin.application.port.in;

import java.util.List;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;

public interface ListPluginRuntimeSourcesUseCase {
    /** Every plugin of the caller's current organization, for the forms and results they may open. */
    List<PluginRuntimeSourceDto> list(Long userId);

    /**
     * The plugins a snapshot of the caller's current organization renders with, for the same callers:
     * a reviewer opens a run's results without seeing the organization's models.
     */
    List<PluginRuntimeSourceDto> listPinned(Long userId, Long schemaVersionId);
}
