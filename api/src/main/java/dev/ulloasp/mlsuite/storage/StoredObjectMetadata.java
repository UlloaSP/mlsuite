package dev.ulloasp.mlsuite.storage;

public record StoredObjectMetadata(
        String bucket,
        String objectKey,
        long sizeBytes,
        String etag,
        String versionId,
        String sha256) {
}
