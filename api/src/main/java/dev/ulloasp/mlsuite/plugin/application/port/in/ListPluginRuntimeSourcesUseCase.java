package dev.ulloasp.mlsuite.plugin.application.port.in;

import java.util.List;
import java.util.Set;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;

public interface ListPluginRuntimeSourcesUseCase {
    /** Every plugin of the caller's current organization, for the forms and results they may open. */
    List<PluginRuntimeSourceDto> list(Long userId);

    /**
     * The organization's plugins of these kinds, for a form whose schema uses them. Running a form
     * needs no plugin permission: the caller decides who may open the form, not who owns the plugin.
     */
    List<PluginRuntimeSourceDto> listUsed(Long organizationId, Set<String> kinds);
}
