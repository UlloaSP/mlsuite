package dev.ulloasp.mlsuite.plugin.application.service;

import java.io.IOException;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;
import lombok.RequiredArgsConstructor;

/**
 * A plugin's stored object names who last wrote it. When that person's account goes, each plugin
 * they wrote is stored again as written by "Deleted user", and the revision that named them is
 * queued for deletion: the bucket keeps every revision, so leaving it would keep the name.
 */
@Component
@RequiredArgsConstructor
public class PluginAuthorship {

    private final PluginMetadataRepository metadata;
    private final PluginObjectReader objects;
    private final ObjectStorageService storage;
    private final StorageProperties properties;
    private final StorageDeletionQueue deletionQueue;
    private final ObjectMapper mapper;

    /** Takes the person's name off up to {@code limit} of their plugins and says how many it found. */
    @Transactional
    public int forget(Long userId, int limit) {
        List<PluginMetadata> written = metadata.findByUpdatedByIdOrderByIdAsc(userId, PageRequest.of(0, limit));
        written.forEach(this::anonymize);
        return written.size();
    }

    private void anonymize(PluginMetadata row) {
        objects.readPinned(row).ifPresent(plugin -> {
            StoredObject stored = storage.store(row.getObjectKey(), plugin.fileName(), "application/json",
                    bytes(new StoredPlugin(plugin.id(), plugin.fileName(), plugin.contentType(), plugin.sizeBytes(),
                            plugin.createdAt(), plugin.updatedAt(), DeletedUser.NAME, null, plugin.source())));
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        storage.delete(stored.bucket(), stored.objectKey(), stored.versionId());
                    }
                }
            });
            deletionQueue.enqueue(row.getOrganization().getId(), properties.getBucket(), row.getObjectKey(),
                    row.getStorageVersionId());
            row.setSizeBytes(stored.sizeBytes());
            row.setSha256(stored.sha256());
            row.setStorageVersionId(stored.versionId());
        });
        row.setUpdatedBy(null);
        metadata.save(row);
    }

    private byte[] bytes(StoredPlugin plugin) {
        try {
            return mapper.writeValueAsBytes(plugin);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not serialize plugin.", ex);
        }
    }
}
