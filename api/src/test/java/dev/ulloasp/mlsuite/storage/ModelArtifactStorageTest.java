package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import org.junit.jupiter.api.Test;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.support.TestFixtures;

class ModelArtifactStorageTest {

    @Test
    void writerReadsBackUploadAndPersistsIndependentIdentity() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage);
        Model model = model();
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(sha256)))
                .thenAnswer(call -> stored(call.getArgument(3), sha256));
        when(storage.verify("bucket", "key", "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, sha256));

        writer.storeAndAttach(model, TestFixtures.artifact(bytes), sha256, "application/octet-stream");

        assertEquals("bucket", model.getStorageBucket());
        assertEquals("key", model.getStorageObjectKey());
        assertEquals("v1", model.getStorageVersionId());
        assertEquals("etag", model.getStorageEtag());
        assertEquals(5L, model.getModelSizeBytes());
        assertEquals(sha256, model.getArtifactSha256());
        assertNotNull(model.getArtifactVerifiedAt());
    }

    @Test
    void writerGivesEachUnsavedModelAKeyOfItsOwn() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage);
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(sha256)))
                .thenAnswer(call -> new StoredObject("bucket", call.getArgument(0), 5, "etag", "v1", sha256));
        when(storage.verify(eq("bucket"), anyString(), eq("v1")))
                .thenReturn(new StoredObjectVerification(bytes.length, sha256));

        String first = writer.storeAndAttach(model(), TestFixtures.artifact(bytes), sha256, "application/zip").objectKey();
        String second = writer.storeAndAttach(model(), TestFixtures.artifact(bytes), sha256, "application/zip").objectKey();

        assertNotEquals(first, second);
        assertTrue(first.matches("organizations/41/models/[0-9a-f-]{36}/artifacts/" + sha256 + "/model\\.mlbundle"), first);
    }

    @Test
    void writerRefusesAStreamThatIsNotTheArtifactItsHashNames() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage);
        Model model = model();
        String expected = ArtifactHash.sha256("model".getBytes());
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(expected)))
                .thenAnswer(call -> stored(call.getArgument(3), expected));

        ObjectStorageException refused = assertThrows(ObjectStorageException.class, () -> writer.storeAndAttach(
                model, TestFixtures.artifact("other".getBytes()), expected, "application/octet-stream"));

        assertInstanceOf(ArtifactIntegrityException.class, refused.getCause().getCause());
        verify(storage, never()).verify(anyString(), anyString(), anyString());
        assertNull(model.getStorageObjectKey());
    }

    @Test
    void writerDeletesOnlyTheFailedUploadedVersion() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage);
        Model model = model();
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(sha256)))
                .thenAnswer(call -> stored(call.getArgument(3), sha256));
        when(storage.verify("bucket", "key", "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, ArtifactHash.sha256("corrupt".getBytes())));

        assertThrows(ArtifactIntegrityException.class,
                () -> writer.storeAndAttach(model, TestFixtures.artifact(bytes), sha256, "application/octet-stream"));

        verify(storage).delete("bucket", "key", "v1");
        verify(storage, never()).delete("bucket", "key", null);
        assertNull(model.getStorageObjectKey());
    }

    @Test
    void readerStreamsThePersistedObjectVersionInsteadOfTheLatestVersion() throws IOException {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        byte[] bytes = "model".getBytes();
        when(storage.open("bucket", "key", "v1")).thenReturn(new ByteArrayInputStream(bytes));

        assertArrayEquals(bytes, read(new ModelArtifactContentReader(storage)
                .source(stored("v1", ArtifactHash.sha256(bytes), bytes.length))));

        verify(storage).open("bucket", "key", "v1");
        verify(storage, never()).open("bucket", "key", null);
    }

    @Test
    void readerVerifiesTheObjectAsItStreams() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        byte[] bytes = "model".getBytes();
        when(storage.open("bucket", "key", "v1")).thenReturn(new ByteArrayInputStream(bytes));
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage);

        IOException mismatch = assertThrows(IOException.class, () -> read(reader.source(
                stored("v1", ArtifactHash.sha256("other".getBytes()), bytes.length))));

        assertInstanceOf(ArtifactIntegrityException.class, mismatch.getCause());
    }

    @Test
    void readerRethrowsTheStorageFailure() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ObjectStorageException down = new ObjectStorageException("down");
        when(storage.open("bucket", "key", "v1")).thenThrow(down);
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage);

        assertSame(down, assertThrows(ObjectStorageException.class,
                () -> reader.source(stored("v1", ArtifactHash.sha256("model".getBytes()), 5)).open()));
    }

    private static byte[] read(ArtifactSource source) throws IOException {
        try (InputStream in = source.open()) {
            return in.readAllBytes();
        }
    }

    /** What the store answers once it has read the whole stream, as an S3 client reads it. */
    private static StoredObject stored(InputStream in, String sha256) {
        try {
            byte[] read = in.readAllBytes();
            return new StoredObject("bucket", "key", read.length, "etag", "v1", sha256);
        } catch (IOException ex) {
            throw new ObjectStorageException("store failed", ex);
        }
    }

    private static ModelArtifactReference stored(String versionId, String sha256, long sizeBytes) {
        return new ModelArtifactReference(7L, "model.mlbundle", "bucket", "key", versionId, sizeBytes, sha256);
    }

    private Model model() {
        Organization organization = new Organization();
        organization.setId(41L);
        Model model = new Model();
        model.setName("Risk");
        model.setOrganization(organization);
        model.setFileName("model.mlbundle");
        return model;
    }
}
