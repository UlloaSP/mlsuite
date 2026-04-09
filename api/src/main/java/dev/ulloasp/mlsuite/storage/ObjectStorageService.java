package dev.ulloasp.mlsuite.storage;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

public interface ObjectStorageService {

    StoredObject store(String objectKey, String fileName, String contentType, InputStream inputStream, long sizeBytes);

    default StoredObject store(String objectKey, String fileName, String contentType, byte[] bytes) {
        return store(objectKey, fileName, contentType, new ByteArrayInputStream(bytes), bytes.length);
    }

    byte[] load(String bucket, String objectKey);

    void delete(String bucket, String objectKey);
}
