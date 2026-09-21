package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
        when(storage.load("bucket", "key")).thenReturn(bytes);

        writer.storeAndAttach(model, bytes, "application/octet-stream");

        assertEquals(ModelArtifactState.VERIFIED, model.getArtifactState());
        assertEquals(sha256, model.getArtifactSha256());
        assertEquals("v1", model.getStorageVersionId());
        assertArrayEquals(bytes, model.getModelFile());
    }

    @Test
    void writerRemovesUploadWhenReadBackDoesNotMatch() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, new StorageProperties());
        byte[] bytes = "model".getBytes();
        when(storage.store(anyString(), anyString(), anyString(), any(byte[].class)))
                .thenReturn(new StoredObject("bucket", "key", bytes.length, "etag", "v1", ArtifactHash.sha256(bytes)));
        when(storage.load("bucket", "key")).thenReturn("corrupt".getBytes());

        assertThrows(ArtifactIntegrityException.class,
                () -> writer.storeAndAttach(model(), bytes, "application/octet-stream"));

        verify(storage).delete("bucket", "key", "v1");
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
        when(storage.load("bucket", "key")).thenThrow(new ObjectStorageException("down"));

        assertArrayEquals(bytes, new ModelArtifactContentReader(storage).loadVerified(model));

        model.setArtifactSha256(ArtifactHash.sha256("different".getBytes()));
        assertThrows(ArtifactIntegrityException.class,
                () -> new ModelArtifactContentReader(storage).loadVerified(model));
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
