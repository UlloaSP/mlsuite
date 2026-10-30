package dev.ulloasp.mlsuite.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketVersioningStatus;

/** Runs against the storage server MLsuite deploys: this contract is what the persisted version ids rely on. */
@Testcontainers(disabledWithoutDocker = true)
class S3ObjectStorageServiceTest {

    private static final String ACCESS_KEY = "storage-test";
    private static final String SECRET_KEY = "storage-test-secret";

    @Container
    static final GenericContainer<?> RUSTFS = new GenericContainer<>(
            "rustfs/rustfs:1.0.4@sha256:ed9210d6411d77ffceb70d94b964a3cb7d225983368bc25bebe01e995293dcc2")
            .withEnv("RUSTFS_ACCESS_KEY", ACCESS_KEY)
            .withEnv("RUSTFS_SECRET_KEY", SECRET_KEY)
            .withExposedPorts(9000)
            .waitingFor(Wait.forHttp("/health/ready").forPort(9000));

    private StorageProperties properties;
    private S3Client client;
    private S3ObjectStorageService storage;

    @BeforeEach
    void versionedBucket() {
        properties = properties("artifacts-" + UUID.randomUUID());
        client = ObjectStorageConfig.s3Client(properties);
        storage = new S3ObjectStorageService(client, properties);
        createBucket(properties.getBucket(), true);
    }

    @Test
    void persistedVersionIdKeepsReadingTheBytesItWasStoredWith() {
        byte[] first = "first".getBytes();
        byte[] second = "second version".getBytes();

        StoredObject original = storage.store("model/key", "model.bin", "application/zip", first);
        StoredObject replacement = storage.store("model/key", "model.bin", "application/zip", second);

        assertNotEquals(original.versionId(), replacement.versionId());
        assertArrayEquals(first, storage.load(properties.getBucket(), "model/key", original.versionId()));
        assertArrayEquals(second, storage.load(properties.getBucket(), "model/key", null));
        StoredObjectMetadata metadata = storage
                .inspectOptional(properties.getBucket(), "model/key", original.versionId())
                .orElseThrow();
        assertEquals(new StoredObjectMetadata(properties.getBucket(), "model/key", first.length,
                original.etag(), original.versionId(), ArtifactHash.sha256(first)), metadata);
        assertFalse(original.etag().contains("\""), "the persisted ETag is the bare value");
    }

    @Test
    void verifyHashesTheExactVersion() {
        byte[] bytes = "model".getBytes();
        StoredObject stored = storage.store("model/key", "model.bin", null, bytes);
        storage.store("model/key", "model.bin", null, "other".getBytes());

        StoredObjectVerification verified = storage.verify(stored.bucket(), stored.objectKey(), stored.versionId());

        assertEquals(new StoredObjectVerification(bytes.length, ArtifactHash.sha256(bytes)), verified);
    }

    @Test
    void anArtifactStreamedInChecksItsIdentityOnTheWay() throws IOException {
        byte[] bytes = new byte[6 * 1024 * 1024];
        Arrays.fill(bytes, (byte) 7);
        String sha256 = ArtifactHash.sha256(bytes);

        StoredObject stored;
        try (InputStream in = new VerifyingInputStream(
                new ByteArrayInputStream(bytes), "model 1", (long) bytes.length, sha256)) {
            stored = storage.store("model/big", "model.bin", "application/zip", in, bytes.length, sha256);
        }

        assertEquals(sha256, storage.verify(stored.bucket(), stored.objectKey(), stored.versionId()).sha256());
    }

    @Test
    void anUploadThatFailsItsIdentityLeavesNoObject() {
        byte[] bytes = new byte[6 * 1024 * 1024];
        String wrong = ArtifactHash.sha256("something else".getBytes());
        InputStream in = new VerifyingInputStream(
                new ByteArrayInputStream(bytes), "model 1", (long) bytes.length, wrong);

        assertThrows(ObjectStorageException.class,
                () -> storage.store("model/corrupt", "model.bin", null, in, bytes.length, wrong));

        assertEquals(Optional.empty(), storage.inspectOptional(properties.getBucket(), "model/corrupt", null));
    }

    @Test
    void aSourceThatBreaksMidUploadLeavesNoObject() {
        InputStream broken = new InputStream() {
            private int remaining = 1024 * 1024;

            @Override
            public int read() throws IOException {
                if (remaining-- <= 0) {
                    throw new IOException("source lost");
                }
                return 0;
            }
        };

        assertThrows(ObjectStorageException.class,
                () -> storage.store("model/broken", "model.bin", null, broken, 4L * 1024 * 1024, null));

        assertEquals(Optional.empty(), storage.inspectOptional(properties.getBucket(), "model/broken", null));
    }

    @Test
    void aMissingKeyOrVersionIsAbsentRatherThanAFailure() {
        StoredObject stored = storage.store("model/key", "model.bin", null, "model".getBytes());
        String unknownVersion = UUID.randomUUID().toString();

        assertEquals(Optional.empty(), storage.inspectOptional(stored.bucket(), "model/none", null));
        assertEquals(Optional.empty(), storage.loadOptional(stored.bucket(), "model/none", null));
        assertEquals(Optional.empty(), storage.inspectOptional(stored.bucket(), stored.objectKey(), unknownVersion));
        assertArrayEquals("model".getBytes(),
                storage.loadOptional(stored.bucket(), stored.objectKey(), stored.versionId()).orElseThrow());
    }

    @Test
    void openingAMissingVersionFails() {
        StoredObject stored = storage.store("model/key", "model.bin", null, "model".getBytes());

        assertThrows(ObjectStorageException.class,
                () -> storage.open(stored.bucket(), stored.objectKey(), UUID.randomUUID().toString()));
    }

    @Test
    void deletingAVersionKeepsTheOthers() {
        StoredObject kept = storage.store("model/key", "model.bin", null, "kept".getBytes());
        StoredObject deleted = storage.store("model/key", "model.bin", null, "deleted".getBytes());

        storage.delete(deleted.bucket(), deleted.objectKey(), deleted.versionId());

        assertEquals(Optional.empty(),
                storage.inspectOptional(deleted.bucket(), deleted.objectKey(), deleted.versionId()));
        assertArrayEquals("kept".getBytes(), storage.load(kept.bucket(), kept.objectKey(), kept.versionId()));
        storage.delete(deleted.bucket(), deleted.objectKey(), deleted.versionId());
    }

    @Test
    void deletingWithoutAVersionHidesTheObjectButKeepsItsVersions() {
        StoredObject stored = storage.store("model/key", "model.bin", null, "model".getBytes());

        storage.delete(stored.bucket(), stored.objectKey(), null);

        assertEquals(Optional.empty(), storage.inspectOptional(stored.bucket(), stored.objectKey(), null));
        assertArrayEquals("model".getBytes(), storage.load(stored.bucket(), stored.objectKey(), stored.versionId()));
    }

    @Test
    void listReturnsEveryObjectUnderThePrefix() {
        StoredObject stored = storage.store("organizations/1/a", "a.bin", null, "aa".getBytes());
        storage.store("organizations/1/nested/b", "b.bin", null, "bbb".getBytes());
        storage.store("organizations/2/c", "c.bin", null, "c".getBytes());

        List<StoredObjectItem> items = storage.list("organizations/1/");

        assertEquals(List.of("organizations/1/a", "organizations/1/nested/b"),
                items.stream().map(StoredObjectItem::objectKey).toList());
        assertEquals(2L, items.getFirst().sizeBytes());
        assertEquals(stored.etag(), items.getFirst().etag());
        assertTrue(items.getFirst().lastModified() != null);
    }

    @Test
    void anUnversionedBucketRefusesTheWrite() {
        StorageProperties unversioned = properties("unversioned-" + UUID.randomUUID());
        createBucket(unversioned.getBucket(), false);
        S3ObjectStorageService store = new S3ObjectStorageService(client, unversioned);

        ObjectStorageException refused = assertThrows(ObjectStorageException.class,
                () -> store.store("model/key", "model.bin", null, "model".getBytes()));

        assertEquals("Object storage bucket versioning is required", refused.getMessage());
    }

    @Test
    void aMissingBucketIsCreatedOnlyWhenAllowed() {
        StorageProperties refusing = properties("missing-" + UUID.randomUUID());
        S3ObjectStorageService store = new S3ObjectStorageService(client, refusing);

        assertThrows(ObjectStorageException.class, () -> store.list("any/"));

        refusing.setAutoCreateBucket(true);
        assertEquals(List.of(), store.list("any/"));
    }

    private void createBucket(String bucket, boolean versioned) {
        client.createBucket(request -> request.bucket(bucket));
        if (versioned) {
            client.putBucketVersioning(request -> request.bucket(bucket)
                    .versioningConfiguration(config -> config.status(BucketVersioningStatus.ENABLED)));
        }
    }

    private static StorageProperties properties(String bucket) {
        StorageProperties properties = new StorageProperties();
        properties.setEndpoint("http://" + RUSTFS.getHost() + ":" + RUSTFS.getMappedPort(9000));
        properties.setAccessKey(ACCESS_KEY);
        properties.setSecretKey(SECRET_KEY);
        properties.setBucket(bucket);
        return properties;
    }
}
