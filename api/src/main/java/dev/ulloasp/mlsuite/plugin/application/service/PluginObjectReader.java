package dev.ulloasp.mlsuite.plugin.application.service;

import tools.jackson.core.JacksonException;
import java.util.Optional;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ArtifactIntegrityVerifier;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import lombok.RequiredArgsConstructor;

/**
 * Reads a plugin as its metadata row pins it: the exact stored version, checked against its
 * size and SHA-256. A plugin is stored with its row in one transaction, and deleted with it, so an
 * object without a row is not a plugin.
 */
@Component
@RequiredArgsConstructor
public class PluginObjectReader {
    private final ObjectStorageService storage;
    private final StorageProperties properties;
    private final ObjectMapper mapper;
    private final PluginMetadataRepository metadata;

    @Transactional(readOnly = true)
    public StoredPlugin load(Long organizationId, String id) {
        return find(organizationId, id).orElseThrow(() -> new PluginNotFoundException(id));
    }

    /**
     * Empty when the plugin or its object is gone. A caller that goes on after
     * a missing plugin needs this instead of {@link #load}, whose exception dooms the transaction.
     */
    @Transactional(readOnly = true)
    public Optional<StoredPlugin> find(Long organizationId, String id) {
        return metadata.findByPublicIdAndOrganizationId(id, organizationId).flatMap(this::readPinned);
    }

    @Transactional(readOnly = true)
    public Optional<StoredPlugin> readPinned(PluginMetadata item) {
        return storage.loadOptional(item.getStorageBucket(), item.getObjectKey(), item.getStorageVersionId())
                .map(bytes -> {
                    ArtifactIntegrityVerifier.verify("plugin " + item.getPublicId(), item.getSizeBytes(), item.getSha256(), bytes);
                    return decode(bytes);
                });
    }

    private StoredPlugin decode(byte[] bytes) {
        try {
            return mapper.readValue(bytes, StoredPlugin.class);
        } catch (JacksonException error) {
            throw new IllegalStateException("Could not deserialize plugin.", error);
        }
    }
}
