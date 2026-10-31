package dev.ulloasp.mlsuite.admin.purge;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.model.application.runtime.RuntimeEnvironments;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import lombok.RequiredArgsConstructor;

/**
 * Rows that own something outside the database: each batch queues the row's objects in the
 * transaction that deletes it, so a crash leaves both or neither. A model's environment is released
 * after that commit, once no other model uses it; the environment's record stays, global.
 */
@Component
@RequiredArgsConstructor
class PurgeBlobSteps {

    private final JdbcTemplate jdbc;
    private final StorageDeletionQueue deletionQueue;
    private final StorageProperties storage;
    private final RuntimeEnvironments environments;

    private record StoredModel(Long organizationId, String bucket, String key, String version, String environment) {
    }

    private record StoredPlugin(String key, Long organizationId) {
    }

    List<PurgeStep> models(PurgeJob job) {
        if (job.scope() == PurgeScope.SCHEMA) return List.of();
        boolean one = job.scope() == PurgeScope.MODEL;
        String chosen = one ? "id = ?" : "organization_id = ?";
        Long key = one ? job.targetId() : job.organizationId();
        return List.of(new PurgeStep("models", limit -> {
            List<StoredModel> deleted = jdbc.query("DELETE FROM model WHERE id IN (SELECT id FROM model WHERE " + chosen
                    + " LIMIT ?) RETURNING organization_id, storage_bucket, storage_object_key, storage_version_id,"
                    + " environment_key",
                    (rs, n) -> new StoredModel(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                            rs.getString(5)), key, limit);
            Set<String> environmentKeys = new HashSet<>();
            deleted.forEach(model -> {
                deletionQueue.enqueue(model.organizationId(), model.bucket(), model.key(), model.version());
                environmentKeys.add(model.environment());
            });
            environmentKeys.forEach(environments::releaseWhenUnused);
            return deleted.size();
        }));
    }

    /** Every revision of a plugin's key: nothing writes to a plugin's id again. */
    List<PurgeStep> plugins(PurgeJob job) {
        if (!job.scope().ownsOrganization()) return List.of();
        return List.of(new PurgeStep("plugins", limit -> {
            List<StoredPlugin> deleted = jdbc.query("""
                    DELETE FROM plugin_metadata WHERE id IN (
                        SELECT id FROM plugin_metadata WHERE organization_id = ? LIMIT ?)
                    RETURNING object_key, organization_id""", (rs, n) -> new StoredPlugin(rs.getString(1), rs.getLong(2)),
                    job.organizationId(), limit);
            deleted.forEach(plugin -> deletionQueue.enqueue(plugin.organizationId(), storage.getBucket(), plugin.key(), null));
            return deleted.size();
        }));
    }
}
