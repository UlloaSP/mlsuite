package dev.ulloasp.mlsuite.plugin.application.service;

import java.io.IOException;
import java.util.List;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginStoragePaths;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactIntegrityException;
import dev.ulloasp.mlsuite.storage.ArtifactIntegrityVerifier;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;

@Component
public class PluginObjectReader {
    private final ObjectStorageService storage;
    private final StorageProperties properties;
    private final ObjectMapper mapper;
    private final PluginMetadataRepository metadata;
    private final StorageDeletionQueue deletionQueue;

    public PluginObjectReader(
            ObjectStorageService storage,
            StorageProperties properties,
            ObjectMapper mapper,
            PluginMetadataRepository metadata,
            StorageDeletionQueue deletionQueue) {
        this.storage = storage;
        this.properties = properties;
        this.mapper = mapper;
        this.metadata = metadata;
        this.deletionQueue = deletionQueue;
    }

    public List<StoredPlugin> list(Long organizationId) {
        return listWithIdentity(organizationId).stream().map(ReadPlugin::plugin).toList();
    }

    public List<ReadPlugin> listWithIdentity(Long organizationId) {
        return storage.list(PluginStoragePaths.organizationItemsPrefix("plugins", organizationId)).stream()
                .filter(item -> item.objectKey().endsWith(".json"))
                .filter(item -> !deletionQueue.isDeletionRequested(properties.getBucket(), item.objectKey()))
                .map(item -> readVerified(
                        organizationId,
                        item.objectKey(),
                        objectId(organizationId, item.objectKey()),
                        false))
                .toList();
    }

    public StoredPlugin load(Long organizationId, String id) {
        String objectKey = PluginStoragePaths.organizationItemObjectKey("plugins", organizationId, id);
        if (deletionQueue.isDeletionRequested(properties.getBucket(), objectKey)) {
            throw new PluginNotFoundException(id);
        }
        return readVerified(organizationId, objectKey, id, true).plugin();
    }

    private ReadPlugin readVerified(
            Long organizationId,
            String objectKey,
            String expectedId,
            boolean missingAsNotFound) {
        var persisted = metadata.findByObjectKeyAndOrganizationId(objectKey, organizationId);
        String versionId = persisted.map(PluginMetadata::getStorageVersionId)
                .filter(value -> !value.isBlank())
                .orElseGet(() -> storage.inspectOptional(properties.getBucket(), objectKey)
                        .map(item -> item.versionId())
                        .orElse(null));
        byte[] bytes = storage.loadOptional(properties.getBucket(), objectKey, versionId)
                .orElseThrow(() -> missingAsNotFound
                        ? new PluginNotFoundException(expectedId)
                        : new IllegalStateException("Could not load plugin object."));
        persisted.filter(item -> !expectedId.equals(item.getId()))
                .ifPresent(item -> {
                    throw new ArtifactIntegrityException(
                            "Plugin metadata identity does not match object key for " + expectedId);
                });
        persisted.filter(item -> item.getSha256() != null)
                .ifPresent(item -> ArtifactIntegrityVerifier.verify(
                        "plugin " + item.getId(), null, item.getSha256(), bytes));
        StoredPlugin plugin = decode(bytes);
        if (!expectedId.equals(plugin.id())) {
            throw new ArtifactIntegrityException(
                    "Plugin identity does not match object key for " + expectedId);
        }
        String exactVersionId = ensureVersioned(objectKey, plugin, bytes, versionId);
        persisted.ifPresent(item -> repairIdentity(item, bytes, exactVersionId));
        return new ReadPlugin(plugin, bytes.length, ArtifactHash.sha256(bytes), exactVersionId);
    }

    private String objectId(Long organizationId, String objectKey) {
        String prefix = PluginStoragePaths.organizationItemsPrefix("plugins", organizationId);
        if (!objectKey.startsWith(prefix) || !objectKey.endsWith(".json")) {
            throw new IllegalStateException("Invalid plugin object key: " + objectKey);
        }
        String id = objectKey.substring(prefix.length(), objectKey.length() - ".json".length());
        if (id.isBlank() || id.contains("/")) {
            throw new IllegalStateException("Invalid plugin object key: " + objectKey);
        }
        return id;
    }

    private void repairIdentity(PluginMetadata persisted, byte[] bytes, String versionId) {
        String actualSha256 = ArtifactHash.sha256(bytes);
        boolean missingVersion = (persisted.getStorageVersionId() == null
                || persisted.getStorageVersionId().isBlank()) && versionId != null;
        if (persisted.getSha256() == null
                || persisted.getSizeBytes() != bytes.length
                || missingVersion) {
            persisted.setSizeBytes(bytes.length);
            persisted.setSha256(actualSha256);
            persisted.setStorageVersionId(versionId);
            metadata.save(persisted);
        }
    }

    private String ensureVersioned(
            String objectKey,
            StoredPlugin plugin,
            byte[] bytes,
            String versionId) {
        if (versionId != null && !versionId.isBlank()) {
            return versionId;
        }
        String storedVersionId = storage.store(
                objectKey, plugin.fileName(), "application/json", bytes).versionId();
        if (storedVersionId == null || storedVersionId.isBlank()) {
            throw new ArtifactIntegrityException("Object storage did not version plugin " + plugin.id());
        }
        return storedVersionId;
    }

    StoredPlugin decode(byte[] bytes) {
        try {
            return mapper.readValue(bytes, StoredPlugin.class);
        } catch (IOException error) {
            throw new IllegalStateException("Could not deserialize plugin.", error);
        }
    }

    public record ReadPlugin(StoredPlugin plugin, long sizeBytes, String sha256, String versionId) {
    }
}
