package dev.ulloasp.mlsuite.plugin;

import dev.ulloasp.mlsuite.support.TestFixtures;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.plugin.application.service.PluginAuthorship;
import dev.ulloasp.mlsuite.plugin.application.service.PluginObjectReader;
import dev.ulloasp.mlsuite.plugin.domain.model.PluginMetadata;
import dev.ulloasp.mlsuite.plugin.domain.model.StoredPlugin;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** A deleted person's name comes off the plugins they last wrote, in every revision the bucket keeps. */
@ExtendWith(MockitoExtension.class)
class PluginAuthorshipTest {

    private static final String KEY = "organizations/7/plugins/items/p1.json";

    @Mock PluginMetadataRepository metadata;
    @Mock PluginObjectReader objects;
    @Mock ObjectStorageService storage;
    @Mock StorageDeletionQueue deletionQueue;

    private final ObjectMapper mapper = new JsonMapper();
    private PluginAuthorship authorship;
    private PluginMetadata row;

    @BeforeEach
    void aPluginWrittenByAda() {
        StorageProperties properties = new StorageProperties();
        properties.setBucket("bucket");
        authorship = new PluginAuthorship(metadata, objects, storage, properties, deletionQueue, mapper);
        Organization team = mock(Organization.class);
        lenient().when(team.getId()).thenReturn(7L);
        User ada = new User("ada", "ada@example.test", "x", "Ada Lovelace", SystemRole.USER);
        row = new PluginMetadata("p1", team, KEY, "body.ts", "application/json", 10, OffsetDateTime.now(),
                OffsetDateTime.now(), TestFixtures.principal(ada), "field", "body");
        row.setStorageBucket("bucket");
        row.setStorageVersionId("v1");
        when(metadata.findByUpdatedByUserIdOrderByIdAsc(eq(3L), any(Pageable.class))).thenReturn(List.of(row));
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void endTransaction() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    @Test
    void thePluginIsStoredAgainAsWrittenByDeletedUserAndTheRevisionNamingThemGoes() throws Exception {
        when(objects.readPinned(row)).thenReturn(Optional.of(new StoredPlugin("p1", "body.ts", "application/typescript",
                10, OffsetDateTime.now(), OffsetDateTime.now(), "Ada Lovelace", "ada@example.test", "source")));
        when(storage.store(eq(KEY), eq("body.ts"), eq("application/json"), any(byte[].class)))
                .thenReturn(new StoredObject("bucket", KEY, 42, "etag", "v2", "a".repeat(64)));

        assertEquals(1, authorship.forget(3L, 100));

        ArgumentCaptor<byte[]> written = ArgumentCaptor.forClass(byte[].class);
        verify(storage).store(eq(KEY), eq("body.ts"), eq("application/json"), written.capture());
        String json = new String(written.getValue(), StandardCharsets.UTF_8);
        StoredPlugin anonymous = mapper.readValue(json, StoredPlugin.class);
        assertEquals(DeletedUser.NAME, anonymous.updatedByName());
        assertNull(anonymous.updatedByEmail());
        assertEquals("source", anonymous.source());
        assertFalse(json.contains("Ada") || json.contains("ada@"), json);
        verify(deletionQueue).enqueue(7L, "bucket", KEY, "v1");
        assertEquals("v2", row.getStorageVersionId());
        assertEquals("a".repeat(64), row.getSha256());
        assertEquals(42, row.getSizeBytes());
        assertNull(row.getUpdatedBy());
        verify(metadata).save(row);
    }

    @Test
    void aRevisionStoredForATransactionThatRollsBackIsDeleted() {
        when(objects.readPinned(row)).thenReturn(Optional.of(new StoredPlugin("p1", "body.ts", "application/typescript",
                10, OffsetDateTime.now(), OffsetDateTime.now(), "Ada Lovelace", "ada@example.test", "source")));
        when(storage.store(eq(KEY), eq("body.ts"), eq("application/json"), any(byte[].class)))
                .thenReturn(new StoredObject("bucket", KEY, 42, "etag", "v2", "a".repeat(64)));

        authorship.forget(3L, 100);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        verify(storage).delete("bucket", KEY, "v2");
    }

    @Test
    void aPluginWhoseObjectIsGoneStillLosesItsAuthor() {
        when(objects.readPinned(row)).thenReturn(Optional.empty());

        assertEquals(1, authorship.forget(3L, 100));

        verify(storage, never()).store(any(), any(), any(), any(byte[].class));
        assertNull(row.getUpdatedBy());
        assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
    }
}
