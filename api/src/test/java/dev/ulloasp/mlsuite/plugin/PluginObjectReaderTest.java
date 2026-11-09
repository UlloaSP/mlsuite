package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.service.PluginObjectReader;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactIntegrityException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;

/** A plugin is read as its row pins it: that exact version, and only bytes with its SHA-256. */
class PluginObjectReaderTest {

    private static final String KEY = "organizations/41/plugins/items/plugin.json";
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final PluginMetadataRepository metadata = mock(PluginMetadataRepository.class);
    private PluginObjectReader reader;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setBucket("plugins");
        reader = new PluginObjectReader(storage, properties, new JsonMapper(), metadata);
    }

    @Test
    void loadRejectsContentThatDoesNotMatchPersistedIdentity() {
        PluginMetadata record = metadata(pluginJson("safe"));
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(pluginJson("tampered")));
        when(metadata.findByPublicIdAndOrganizationId("plugin", 41L)).thenReturn(Optional.of(record));

        assertThrows(ArtifactIntegrityException.class, () -> reader.load(41L, "plugin"));
    }

    @Test
    void loadReturnsPluginAfterIntegrityVerification() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(bytes));
        when(metadata.findByPublicIdAndOrganizationId("plugin", 41L)).thenReturn(Optional.of(record));

        assertEquals("plugin", reader.load(41L, "plugin").id());
        verify(metadata, never()).save(record);
    }

    @Test
    void anObjectWithoutARowIsNoPlugin() {
        when(metadata.findByPublicIdAndOrganizationId("plugin", 41L)).thenReturn(Optional.empty());

        assertThrows(PluginNotFoundException.class, () -> reader.load(41L, "plugin"));
        verifyNoInteractions(storage);
    }

    @Test
    void loadDistinguishesAMissingObjectFromCorruptContent() {
        when(metadata.findByPublicIdAndOrganizationId("plugin", 41L)).thenReturn(Optional.of(metadata(pluginJson("safe"))));
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.empty());

        assertThrows(PluginNotFoundException.class, () -> reader.load(41L, "plugin"));
    }

    private PluginMetadata metadata(byte[] bytes) {
        PluginMetadata record = new PluginMetadata();
        record.setPublicId("plugin");
        record.setObjectKey(KEY);
        record.setSizeBytes(bytes.length);
        record.setStorageBucket("plugins");
        record.setSha256(ArtifactHash.sha256(bytes));
        record.setStorageVersionId("v1");
        return record;
    }

    private byte[] pluginJson(String source) {
        return ("{\"id\":\"plugin\",\"fileName\":\"plugin.ts\","
                + "\"contentType\":\"text/plain\",\"sizeBytes\":1,"
                + "\"createdAt\":\"2026-09-21T00:00:00Z\","
                + "\"updatedAt\":\"2026-09-21T00:00:00Z\","
                + "\"updatedByName\":\"User\",\"updatedByEmail\":\"u@example.test\","
                + "\"source\":\"" + source + "\"}").getBytes(StandardCharsets.UTF_8);
    }
}
