package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;

class ModelArtifactStorageTest {

    @Test
    void writerReadsBackUploadAndPersistsIndependentIdentity() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        StorageProperties properties = new StorageProperties();
        properties.setRetainInlineCopy(true);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, properties);
        Model model = model();
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        when(storage.store(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn(new StoredObject("bucket", "key", bytes.length, "etag", "v1", sha256));
        when(storage.verify("bucket", "key", "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, sha256));

        writer.storeAndAttach(model, bytes, "application/octet-stream");

        assertEquals(ModelArtifactState.VERIFIED, model.getArtifactState());
        assertEquals(sha256, model.getArtifactSha256());
        assertEquals("v1", model.getStorageVersionId());
        assertArrayEquals(bytes, model.getModelFile());
    }

    @Test
    void writerDeletesOnlyTheFailedUploadedVersion() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, new StorageProperties());
        byte[] bytes = "model".getBytes();
        when(storage.store(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn(new StoredObject("bucket", "key", bytes.length, "etag", "v1", ArtifactHash.sha256(bytes)));
        when(storage.verify("bucket", "key", "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, ArtifactHash.sha256("corrupt".getBytes())));

        assertThrows(ArtifactIntegrityException.class,
                () -> writer.storeAndAttach(model(), bytes, "application/octet-stream"));

        verify(storage).delete("bucket", "key", "v1");
        verify(storage, never()).delete("bucket", "key");
    }

    @Test
    void writerAttachesAContentAddressedObjectLeftByAnInterruptedAttempt() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        StorageProperties properties = new StorageProperties();
        properties.setBucket("bucket");
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, properties);
        Model model = model();
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        String key = "organizations/41/models/7/artifacts/" + sha256 + "/model.joblib";
        when(storage.inspectOptional("bucket", key)).thenReturn(Optional.of(
                new StoredObjectMetadata("bucket", key, bytes.length, "etag", "v1", sha256)));
        when(storage.verify("bucket", key, "v1")).thenReturn(new StoredObjectVerification(bytes.length, sha256));

        assertTrue(writer.attachExisting(model, bytes));
        assertEquals(key, model.getStorageObjectKey());
        assertEquals("v1", model.getStorageVersionId());
        verify(storage, never()).store(anyString(), anyString(), anyString(), any(byte[].class));
    }

    @Test
    void writerReplacesCorruptContentAtTheDeterministicKeyWithANewVersion() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        StorageProperties properties = new StorageProperties();
        properties.setBucket("bucket");
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, properties);
        Model model = model();
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        String key = "organizations/41/models/7/artifacts/" + sha256 + "/model.joblib";
        when(storage.inspectOptional("bucket", key)).thenReturn(Optional.of(
                new StoredObjectMetadata("bucket", key, bytes.length, "etag", "v1", sha256)));
        when(storage.verify("bucket", key, "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, ArtifactHash.sha256("bad".getBytes())));

        assertFalse(writer.attachExisting(model, bytes));
        verify(storage, never()).store(anyString(), anyString(), anyString(), any(byte[].class));
    }

    @Test
    void writerReportsWhenTheDeterministicKeyDoesNotExist() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        StorageProperties properties = new StorageProperties();
        properties.setBucket("bucket");
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, properties);
        when(storage.inspectOptional(anyString(), anyString())).thenReturn(Optional.empty());

        assertFalse(writer.attachExisting(model(), "model".getBytes()));
    }

    @Test
    void writerDoesNotAttachAnUnversionedLegacyObject() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        StorageProperties properties = new StorageProperties();
        properties.setBucket("bucket");
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, properties);
        byte[] bytes = "model".getBytes();
        String key = "organizations/41/models/7/artifacts/" + ArtifactHash.sha256(bytes) + "/model.joblib";
        when(storage.inspectOptional("bucket", key)).thenReturn(Optional.of(
                new StoredObjectMetadata("bucket", key, bytes.length, "etag", null, ArtifactHash.sha256(bytes))));

        assertFalse(writer.attachExisting(model(), bytes));
        verify(storage, never()).verify(anyString(), anyString(), anyString());
    }

    @Test
    void readerFallsBackOnlyToAnInlineCopyThatMatchesTheExpectedHash() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        Model model = model();
        byte[] bytes = "model".getBytes();
        model.setModelFile(bytes);
        model.setModelSizeBytes((long) bytes.length);
        model.setArtifactSha256(ArtifactHash.sha256(bytes));
        model.setStorageBucket("bucket");
        model.setStorageObjectKey("key");
        when(storage.load("bucket", "key", null)).thenThrow(new ObjectStorageException("down"));

        assertArrayEquals(bytes, new ModelArtifactContentReader(storage).loadVerified(model));

        model.setArtifactSha256(ArtifactHash.sha256("different".getBytes()));
        assertThrows(ArtifactIntegrityException.class,
                () -> new ModelArtifactContentReader(storage).loadVerified(model));
    }

    @Test
    void readerLoadsThePersistedObjectVersionInsteadOfTheLatestVersion() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        Model model = model();
        byte[] bytes = "model".getBytes();
        model.setModelFile(new byte[0]);
        model.setModelSizeBytes((long) bytes.length);
        model.setArtifactSha256(ArtifactHash.sha256(bytes));
        model.setStorageBucket("bucket");
        model.setStorageObjectKey("key");
        model.setStorageVersionId("v1");
        when(storage.load("bucket", "key", "v1")).thenReturn(bytes);

        assertArrayEquals(bytes, new ModelArtifactContentReader(storage).loadVerified(model));

        verify(storage).load("bucket", "key", "v1");
        verify(storage, never()).load("bucket", "key");
    }

    private Model model() {
        Organization organization = new Organization();
        organization.setId(41L);
        Model model = new Model();
        model.setId(7L);
        model.setOrganization(organization);
        model.setFileName("model.joblib");
        model.setModelFile("model".getBytes());
        return model;
    }
}
