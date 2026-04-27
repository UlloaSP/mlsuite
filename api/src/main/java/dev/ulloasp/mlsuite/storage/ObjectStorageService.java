package dev.ulloasp.mlsuite.storage;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

public interface ObjectStorageService {

    StoredObject store(String objectKey, String fileName, String contentType, InputStream inputStream, long sizeBytes);

    default StoredObject store(String objectKey, String fileName, String contentType, byte[] bytes) {
        return store(objectKey, fileName, contentType, new ByteArrayInputStream(bytes), bytes.length);
    }

    byte[] load(String bucket, String objectKey);

    Optional<byte[]> loadOptional(String bucket, String objectKey);

    List<StoredObjectItem> list(String prefix);

    void delete(String bucket, String objectKey);
}
