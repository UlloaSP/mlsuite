package dev.ulloasp.mlsuite.storage;

import java.io.ByteArrayInputStream;
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

    default StoredObject store(
            String objectKey,
            String fileName,
            String contentType,
            InputStream inputStream,
            long sizeBytes) {
        return store(objectKey, fileName, contentType, inputStream, sizeBytes, null);
    }

    default StoredObject store(String objectKey, String fileName, String contentType, byte[] bytes) {
        return store(
                objectKey,
                fileName,
                contentType,
                new ByteArrayInputStream(bytes),
                bytes.length,
                ArtifactHash.sha256(bytes));
    }

    byte[] load(String bucket, String objectKey);

    byte[] load(String bucket, String objectKey, String versionId);

    Optional<byte[]> loadOptional(String bucket, String objectKey);

    Optional<byte[]> loadOptional(String bucket, String objectKey, String versionId);

    Optional<StoredObjectMetadata> inspectOptional(String bucket, String objectKey);

    Optional<StoredObjectMetadata> inspectOptional(String bucket, String objectKey, String versionId);

    StoredObjectVerification verify(String bucket, String objectKey);

    StoredObjectVerification verify(String bucket, String objectKey, String versionId);

    List<StoredObjectItem> list(String prefix);

    void delete(String bucket, String objectKey);

    void delete(String bucket, String objectKey, String versionId);
}
