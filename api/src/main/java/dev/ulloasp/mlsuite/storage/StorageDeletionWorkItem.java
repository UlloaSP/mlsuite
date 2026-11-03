package dev.ulloasp.mlsuite.storage;

/** {@code versionId} is the one version to remove; null removes every version of the key. */
public record StorageDeletionWorkItem(Long id, Long organizationId, String bucket, String objectKey, String versionId) {
}
