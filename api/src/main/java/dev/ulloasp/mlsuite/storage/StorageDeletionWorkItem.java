package dev.ulloasp.mlsuite.storage;

public record StorageDeletionWorkItem(Long id, Long organizationId, String bucket, String objectKey) {
}
