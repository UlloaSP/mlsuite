package dev.ulloasp.mlsuite.plugin.application.port.in;

import java.util.List;
import java.util.Set;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;

/** The plugins a published snapshot renders with, fixed when it is published. */
public interface SnapshotPluginsUseCase {

    /**
     * Fixes, for a snapshot being written, the organization's newest plugin declaring each of the
     * custom {@code kinds} its form names; kinds no plugin declares are built in. Runs in the
     * transaction that writes the snapshot.
     */
    void pin(Long organizationId, Long schemaVersionId, Set<String> kinds);

    /** Gives a snapshot being written the plugins another snapshot of the organization was fixed with. */
    void copy(Long sourceSchemaVersionId, Long schemaVersionId);

    /** The plugins a snapshot of the organization renders with, as the runtime loads them. */
    List<PluginRuntimeSourceDto> pinned(Long organizationId, Long schemaVersionId);
}
