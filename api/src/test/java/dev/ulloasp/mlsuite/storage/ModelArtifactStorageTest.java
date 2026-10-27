package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
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

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
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
        verify(storage, never()).delete("bucket", "key", null);
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
        String key = "organizations/41/models/7/artifacts/" + sha256 + "/model.mlbundle";
        when(storage.inspectOptional("bucket", key, null)).thenReturn(Optional.of(
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
        String key = "organizations/41/models/7/artifacts/" + sha256 + "/model.mlbundle";
        when(storage.inspectOptional("bucket", key, null)).thenReturn(Optional.of(
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
        when(storage.inspectOptional(anyString(), anyString(), any())).thenReturn(Optional.empty());

        assertFalse(writer.attachExisting(model(), "model".getBytes()));
    }

    @Test
    void writerDoesNotAttachAnUnversionedLegacyObject() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        StorageProperties properties = new StorageProperties();
        properties.setBucket("bucket");
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, properties);
        byte[] bytes = "model".getBytes();
        String key = "organizations/41/models/7/artifacts/" + ArtifactHash.sha256(bytes) + "/model.mlbundle";
        when(storage.inspectOptional("bucket", key, null)).thenReturn(Optional.of(
                new StoredObjectMetadata("bucket", key, bytes.length, "etag", null, ArtifactHash.sha256(bytes))));

        assertFalse(writer.attachExisting(model(), bytes));
        verify(storage, never()).verify(anyString(), anyString(), anyString());
    }

    @Test
    void readerFallsBackOnlyToAnInlineCopyThatMatchesTheExpectedHash() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelRepository models = mock(ModelRepository.class);
        byte[] bytes = "model".getBytes();
        when(storage.load("bucket", "key", null)).thenThrow(new ObjectStorageException("down"));
        when(models.findModelFile(7L)).thenReturn(Optional.of(bytes));
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage, models);

        assertArrayEquals(bytes, reader.loadVerified(stored(null, ArtifactHash.sha256(bytes), bytes.length)));

        assertThrows(ArtifactIntegrityException.class, () -> reader.loadVerified(
                stored(null, ArtifactHash.sha256("different".getBytes()), bytes.length)));
    }

    @Test
    void readerRethrowsTheStorageFailureWhenNoInlineCopyIsKept() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelRepository models = mock(ModelRepository.class);
        ObjectStorageException down = new ObjectStorageException("down");
        when(storage.load("bucket", "key", null)).thenThrow(down);
        when(models.findModelFile(7L)).thenReturn(Optional.of(new byte[0]));
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage, models);

        assertSame(down, assertThrows(ObjectStorageException.class,
                () -> reader.loadVerified(stored(null, ArtifactHash.sha256("model".getBytes()), 5))));
    }

    @Test
    void readerLoadsThePersistedObjectVersionInsteadOfTheLatestVersion() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelRepository models = mock(ModelRepository.class);
        byte[] bytes = "model".getBytes();
        when(storage.load("bucket", "key", "v1")).thenReturn(bytes);

        assertArrayEquals(bytes, new ModelArtifactContentReader(storage, models)
                .loadVerified(stored("v1", ArtifactHash.sha256(bytes), bytes.length)));

        verify(storage).load("bucket", "key", "v1");
        verify(storage, never()).load("bucket", "key", null);
        verify(models, never()).findModelFile(any());
    }

    @Test
    void readerReadsTheInlineCopyOfAModelWithoutAStoredObject() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelRepository models = mock(ModelRepository.class);
        byte[] bytes = "model".getBytes();
        when(models.findModelFile(7L)).thenReturn(Optional.of(bytes));
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage, models);
        ModelArtifactReference inlineOnly = new ModelArtifactReference(7L, "model.mlbundle", null, null, null,
                (long) bytes.length, null);

        assertArrayEquals(bytes, reader.loadVerified(inlineOnly));

        when(models.findModelFile(7L)).thenReturn(Optional.of(new byte[0]));
        assertThrows(ArtifactIntegrityException.class, () -> reader.loadVerified(inlineOnly));
        verify(storage, never()).load(any(), any(), any());
    }

    private static ModelArtifactReference stored(String versionId, String sha256, long sizeBytes) {
        return new ModelArtifactReference(7L, "model.mlbundle", "bucket", "key", versionId, sizeBytes, sha256);
    }

    private Model model() {
        Organization organization = new Organization();
        organization.setId(41L);
        Model model = new Model();
        model.setId(7L);
        model.setOrganization(organization);
        model.setFileName("model.mlbundle");
        model.setModelFile("model".getBytes());
        return model;
    }
}
