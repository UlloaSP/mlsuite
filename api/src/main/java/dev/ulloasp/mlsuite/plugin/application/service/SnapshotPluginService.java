package dev.ulloasp.mlsuite.plugin.application.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginRuntimeSourceDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.SnapshotPluginsUseCase;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SnapshotPluginService implements SnapshotPluginsUseCase {

    private final JdbcTemplate jdbc;
    private final PluginMetadataRepository metadata;
    private final PluginObjectReader objects;

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void pin(Long organizationId, Long schemaVersionId, Set<String> kinds) {
        if (kinds.isEmpty()) return;
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO schema_version_plugin (organization_id, schema_version_id, plugin_metadata_id)
                    SELECT DISTINCT ON (kind) organization_id, ?, id FROM plugin_metadata
                    WHERE organization_id = ? AND kind = ANY(?)
                    ORDER BY kind, created_at DESC, id DESC""");
            statement.setLong(1, schemaVersionId);
            statement.setLong(2, organizationId);
            statement.setArray(3, connection.createArrayOf("varchar", kinds.toArray()));
            return statement;
        });
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void copy(Long sourceSchemaVersionId, Long schemaVersionId) {
        jdbc.update("""
                INSERT INTO schema_version_plugin (organization_id, schema_version_id, plugin_metadata_id)
                SELECT organization_id, ?, plugin_metadata_id FROM schema_version_plugin WHERE schema_version_id = ?""",
                schemaVersionId, sourceSchemaVersionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PluginRuntimeSourceDto> pinned(Long schemaVersionId) {
        List<Long> ids = jdbc.queryForList(
                "SELECT plugin_metadata_id FROM schema_version_plugin WHERE schema_version_id = ? ORDER BY plugin_metadata_id",
                Long.class, schemaVersionId);
        return metadata.findAllById(ids).stream()
                .map(objects::readPinned)
                .flatMap(Optional::stream)
                .map(PluginRuntimeSourceDto::from)
                .toList();
    }
}
