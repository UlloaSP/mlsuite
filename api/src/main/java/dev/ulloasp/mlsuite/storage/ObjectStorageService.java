package dev.ulloasp.mlsuite.storage;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

public interface ObjectStorageService {

    StoredObject store(
            String objectKey,
            String fileName,
            String contentType,
            InputStream inputStream,
            long sizeBytes,
            String sha256);

    default StoredObject store(String objectKey, String fileName, String contentType, byte[] bytes) {
        return store(
                objectKey,
                fileName,
                contentType,
                new ByteArrayInputStream(bytes),
                bytes.length,
                ArtifactHash.sha256(bytes));
    }

    /** Reads an object as a stream; the caller closes it. */
    InputStream open(String bucket, String objectKey, String versionId);

    /** Reads a whole object into memory: for small objects only. */
    default byte[] load(String bucket, String objectKey, String versionId) {
        try (InputStream in = open(bucket, objectKey, versionId)) {
            return in.readAllBytes();
        } catch (IOException ex) {
            throw new ObjectStorageException("The object could not be read", ex);
        }
    }

    Optional<byte[]> loadOptional(String bucket, String objectKey, String versionId);

    Optional<StoredObjectMetadata> inspectOptional(String bucket, String objectKey, String versionId);

    StoredObjectVerification verify(String bucket, String objectKey, String versionId);

    List<StoredObjectItem> list(String prefix);

    void delete(String bucket, String objectKey, String versionId);

    /** Removes every stored version of the key and its delete markers, leaving nothing to restore. */
    void deleteAllVersions(String bucket, String objectKey);
}
