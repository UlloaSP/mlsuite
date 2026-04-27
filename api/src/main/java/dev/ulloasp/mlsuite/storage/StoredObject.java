package dev.ulloasp.mlsuite.storage;

public record StoredObject(
        String bucket,
        String objectKey,
        long sizeBytes,
        String etag) {
}
