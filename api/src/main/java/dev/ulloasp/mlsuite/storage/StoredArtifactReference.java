package dev.ulloasp.mlsuite.storage;

public record StoredArtifactReference(
        Long id,
        String bucket,
        String objectKey,
        Long sizeBytes,
        String sha256) {
}
