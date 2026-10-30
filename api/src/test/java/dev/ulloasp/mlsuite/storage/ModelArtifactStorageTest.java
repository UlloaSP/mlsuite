package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
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
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(sha256)))
                .thenAnswer(call -> stored(call.getArgument(3), sha256));
        when(storage.verify("bucket", "key", "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, sha256));

        writer.storeAndAttach(model, ArtifactSource.of(bytes), sha256, "application/octet-stream");

        assertEquals(ModelArtifactState.VERIFIED, model.getArtifactState());
        assertEquals(sha256, model.getArtifactSha256());
        assertEquals("v1", model.getStorageVersionId());
    }

    @Test
    void writerRefusesAStreamThatIsNotTheArtifactItsHashNames() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, new StorageProperties());
        String expected = ArtifactHash.sha256("model".getBytes());
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(expected)))
                .thenAnswer(call -> stored(call.getArgument(3), expected));

        ObjectStorageException refused = assertThrows(ObjectStorageException.class, () -> writer.storeAndAttach(
                model(), ArtifactSource.of("other".getBytes()), expected, "application/octet-stream"));

        assertInstanceOf(ArtifactIntegrityException.class, refused.getCause().getCause());
        verify(storage, never()).verify(anyString(), anyString(), anyString());
    }

    @Test
    void writerDeletesOnlyTheFailedUploadedVersion() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactWriter writer = new ModelArtifactWriter(storage, new StorageProperties());
        byte[] bytes = "model".getBytes();
        String sha256 = ArtifactHash.sha256(bytes);
        when(storage.store(anyString(), anyString(), anyString(), any(InputStream.class), eq(5L), eq(sha256)))
                .thenAnswer(call -> stored(call.getArgument(3), sha256));
        when(storage.verify("bucket", "key", "v1"))
                .thenReturn(new StoredObjectVerification(bytes.length, ArtifactHash.sha256("corrupt".getBytes())));

        assertThrows(ArtifactIntegrityException.class,
                () -> writer.storeAndAttach(model(), ArtifactSource.of(bytes), sha256, "application/octet-stream"));

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
        verify(storage, never()).store(anyString(), anyString(), anyString(), any(InputStream.class), anyLong(), any());
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
        verify(storage, never()).store(anyString(), anyString(), anyString(), any(InputStream.class), anyLong(), any());
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
    void readerFallsBackToTheInlineCopyAndVerifiesItAsItStreams() throws IOException {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactInlineCopy inline = mock(ModelArtifactInlineCopy.class);
        byte[] bytes = "model".getBytes();
        when(storage.open("bucket", "key", null)).thenThrow(new ObjectStorageException("down"));
        when(inline.size(7L)).thenReturn(5L);
        when(inline.open(7L)).thenAnswer(call -> new ByteArrayInputStream(bytes));
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage, inline);

        assertArrayEquals(bytes, read(reader.source(stored(null, ArtifactHash.sha256(bytes), bytes.length))));

        IOException mismatch = assertThrows(IOException.class, () -> read(reader.source(
                stored(null, ArtifactHash.sha256("other".getBytes()), bytes.length))));
        assertInstanceOf(ArtifactIntegrityException.class, mismatch.getCause());
    }

    @Test
    void readerRethrowsTheStorageFailureWhenNoInlineCopyIsKept() {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactInlineCopy inline = mock(ModelArtifactInlineCopy.class);
        ObjectStorageException down = new ObjectStorageException("down");
        when(storage.open("bucket", "key", null)).thenThrow(down);
        when(inline.size(7L)).thenReturn(0L);
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage, inline);

        assertSame(down, assertThrows(ObjectStorageException.class,
                () -> reader.source(stored(null, ArtifactHash.sha256("model".getBytes()), 5)).open()));
    }

    @Test
    void readerStreamsThePersistedObjectVersionInsteadOfTheLatestVersion() throws IOException {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactInlineCopy inline = mock(ModelArtifactInlineCopy.class);
        byte[] bytes = "model".getBytes();
        when(storage.open("bucket", "key", "v1")).thenReturn(new ByteArrayInputStream(bytes));

        assertArrayEquals(bytes, read(new ModelArtifactContentReader(storage, inline)
                .source(stored("v1", ArtifactHash.sha256(bytes), bytes.length))));

        verify(storage).open("bucket", "key", "v1");
        verify(storage, never()).open("bucket", "key", null);
        verify(inline, never()).open(any());
    }

    @Test
    void readerReadsTheInlineCopyOfAModelWithoutAStoredObject() throws IOException {
        ObjectStorageService storage = mock(ObjectStorageService.class);
        ModelArtifactInlineCopy inline = mock(ModelArtifactInlineCopy.class);
        byte[] bytes = "model".getBytes();
        when(inline.size(7L)).thenReturn(5L);
        when(inline.open(7L)).thenAnswer(call -> new ByteArrayInputStream(bytes));
        ModelArtifactContentReader reader = new ModelArtifactContentReader(storage, inline);
        ModelArtifactReference inlineOnly = new ModelArtifactReference(7L, "model.mlbundle", null, null, null,
                (long) bytes.length, null);

        assertArrayEquals(bytes, read(reader.source(inlineOnly)));

        when(inline.size(7L)).thenReturn(0L);
        assertThrows(ArtifactIntegrityException.class, () -> reader.source(inlineOnly).open());
        verify(storage, never()).open(any(), any(), any());
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
        model.setId(7L);
        model.setOrganization(organization);
        model.setFileName("model.mlbundle");
        model.setModelFile("model".getBytes());
        return model;
    }
}
