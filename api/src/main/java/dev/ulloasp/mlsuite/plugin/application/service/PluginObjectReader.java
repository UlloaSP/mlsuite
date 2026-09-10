package dev.ulloasp.mlsuite.plugin.application.service;

import java.io.IOException;
import java.util.List;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginStoragePaths;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;

@Component
public class PluginObjectReader {
    private final ObjectStorageService storage;
    private final StorageProperties properties;
    private final ObjectMapper mapper;

    public PluginObjectReader(ObjectStorageService storage, StorageProperties properties, ObjectMapper mapper) {
        this.storage = storage;
        this.properties = properties;
        this.mapper = mapper;
    }

    public List<StoredPlugin> list(Long organizationId) {
        return storage.list(PluginStoragePaths.organizationItemsPrefix("plugins", organizationId)).stream()
                .filter(item -> item.objectKey().endsWith(".json"))
                .map(item -> storage.loadOptional(properties.getBucket(), item.objectKey())
                        .orElseThrow(() -> new IllegalStateException("Could not load plugin object.")))
                .map(this::decode).toList();
    }

    StoredPlugin decode(byte[] bytes) {
        try {
            return mapper.readValue(bytes, StoredPlugin.class);
        } catch (IOException error) {
            throw new IllegalStateException("Could not deserialize plugin.", error);
        }
    }
}
