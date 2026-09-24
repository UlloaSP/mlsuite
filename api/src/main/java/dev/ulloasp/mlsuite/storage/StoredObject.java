package dev.ulloasp.mlsuite.storage;

public record StoredObject(
        String bucket,
        String objectKey,
        long sizeBytes,
        String etag,
        String versionId,
        String sha256) {

    public StoredObject(String bucket, String objectKey, long sizeBytes, String etag) {
        this(bucket, objectKey, sizeBytes, etag, null, null);
    }
}
