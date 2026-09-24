package dev.ulloasp.mlsuite.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.service.PluginObjectReader;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactIntegrityException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;

class PluginObjectReaderTest {

    private static final String KEY = "organizations/41/plugins/items/plugin.json";
    private final ObjectStorageService storage = mock(ObjectStorageService.class);
    private final PluginMetadataRepository metadata = mock(PluginMetadataRepository.class);
    private PluginObjectReader reader;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setBucket("plugins");
        reader = new PluginObjectReader(
                storage, properties, new ObjectMapper().registerModule(new JavaTimeModule()), metadata);
    }

    @Test
    void loadRejectsContentThatDoesNotMatchPersistedIdentity() {
        byte[] expected = pluginJson("safe");
        byte[] tampered = pluginJson("tampered");
        PluginMetadata record = metadata(expected);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(tampered));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertThrows(ArtifactIntegrityException.class, () -> reader.load(41L, "plugin"));
    }

    @Test
    void loadReturnsPluginAfterIntegrityVerification() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(bytes));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L))
                .thenReturn(Optional.of(record));

        assertEquals("plugin", reader.load(41L, "plugin").id());
        verify(metadata, never()).save(record);
    }

    @Test
    void loadRepairsLegacySourceSizeAfterHashVerification() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        record.setSizeBytes(1);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(bytes));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertEquals("plugin", reader.load(41L, "plugin").id());
        assertEquals(bytes.length, record.getSizeBytes());
        verify(metadata).save(record);
    }

    @Test
    void loadEstablishesIdentityForLegacyMetadataWithoutHash() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        record.setSha256(null);
        record.setSizeBytes(1);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(bytes));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertEquals("plugin", reader.load(41L, "plugin").id());
        assertEquals(bytes.length, record.getSizeBytes());
        assertEquals(ArtifactHash.sha256(bytes), record.getSha256());
        verify(metadata).save(record);
    }

    @Test
    void loadDoesNotTrustInvalidLegacyContent() {
        byte[] invalid = "not-json".getBytes(StandardCharsets.UTF_8);
        PluginMetadata record = metadata(invalid);
        record.setSha256(null);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(invalid));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertThrows(IllegalStateException.class, () -> reader.load(41L, "plugin"));
        verify(metadata, never()).save(record);
    }

    @Test
    void loadDistinguishesAMissingObjectFromCorruptContent() {
        when(storage.loadOptional("plugins", KEY, null)).thenReturn(Optional.empty());

        assertThrows(PluginNotFoundException.class, () -> reader.load(41L, "plugin"));
    }

    @Test
    void loadRejectsAPluginWhoseIdentityDoesNotMatchItsObjectKey() {
        byte[] mismatched = new String(pluginJson("safe"), StandardCharsets.UTF_8)
                .replace("\"id\":\"plugin\"", "\"id\":\"other\"")
                .getBytes(StandardCharsets.UTF_8);
        PluginMetadata record = metadata(mismatched);
        record.setSha256(null);
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(mismatched));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertThrows(ArtifactIntegrityException.class, () -> reader.load(41L, "plugin"));
        verify(metadata, never()).save(record);
    }

    @Test
    void loadRejectsMetadataWhoseIdentityDoesNotMatchItsObjectKey() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        record.setId("other");
        when(storage.loadOptional("plugins", KEY, "v1")).thenReturn(Optional.of(bytes));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertThrows(ArtifactIntegrityException.class, () -> reader.load(41L, "plugin"));
        verify(metadata, never()).save(record);
    }

    @Test
    void loadRepairsAndThenUsesTheResolvedVersionForLegacyMetadata() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        record.setStorageVersionId(null);
        when(storage.loadOptional("plugins", KEY, "legacy-v1")).thenReturn(Optional.of(bytes));
        when(storage.inspectOptional("plugins", KEY)).thenReturn(Optional.of(
                new dev.ulloasp.mlsuite.storage.StoredObjectMetadata(
                        "plugins", KEY, bytes.length, "etag", "legacy-v1", ArtifactHash.sha256(bytes))));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertEquals("plugin", reader.load(41L, "plugin").id());
        assertEquals("legacy-v1", record.getStorageVersionId());
        verify(metadata).save(record);
    }

    @Test
    void loadRewritesAnUnversionedLegacyPluginBeforePersistingItsIdentity() {
        byte[] bytes = pluginJson("safe");
        PluginMetadata record = metadata(bytes);
        record.setStorageVersionId(null);
        when(storage.inspectOptional("plugins", KEY)).thenReturn(Optional.of(
                new dev.ulloasp.mlsuite.storage.StoredObjectMetadata(
                        "plugins", KEY, bytes.length, "etag", null, ArtifactHash.sha256(bytes))));
        when(storage.loadOptional("plugins", KEY, null)).thenReturn(Optional.of(bytes));
        when(storage.store(KEY, "plugin.ts", "application/json", bytes)).thenReturn(
                new dev.ulloasp.mlsuite.storage.StoredObject(
                        "plugins", KEY, bytes.length, "etag-2", "version-2", ArtifactHash.sha256(bytes)));
        when(metadata.findByObjectKeyAndOrganizationId(KEY, 41L)).thenReturn(Optional.of(record));

        assertEquals("plugin", reader.load(41L, "plugin").id());
        assertEquals("version-2", record.getStorageVersionId());
        verify(metadata).save(record);
    }

    private PluginMetadata metadata(byte[] bytes) {
        PluginMetadata record = new PluginMetadata();
        record.setId("plugin");
        record.setObjectKey(KEY);
        record.setSizeBytes(bytes.length);
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
