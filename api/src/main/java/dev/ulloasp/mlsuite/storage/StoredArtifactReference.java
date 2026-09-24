package dev.ulloasp.mlsuite.storage;

public record StoredArtifactReference(
        Long id,
        String bucket,
        String objectKey,
        String versionId,
        Long sizeBytes,
        String sha256) {
}
