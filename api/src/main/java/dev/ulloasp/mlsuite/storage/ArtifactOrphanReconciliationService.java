package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;

public class ArtifactOrphanReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(ArtifactOrphanReconciliationService.class);
    private final ObjectStorageService storage;
    private final ModelRepository models;

    public ArtifactOrphanReconciliationService(
            ObjectStorageService storage,
            ModelRepository models) {
        this.storage = storage;
        this.models = models;
    }

    public ArtifactOrphanReport prune(long graceSeconds) {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusSeconds(graceSeconds);
        long examined = 0;
        long deleted = 0;
        long failed = 0;
        for (StoredObjectItem item : storage.list("organizations/")) {
            if (!isManagedArtifact(item.objectKey()) || !isOlderThan(item, cutoff)) {
                continue;
            }
            examined++;
            try {
                if (isReferenced(item.bucket(), item.objectKey())) {
                    continue;
                }
                var current = storage.inspectOptional(item.bucket(), item.objectKey());
                if (current.isEmpty() || isReferenced(item.bucket(), item.objectKey())) {
                    continue;
                }
                storage.delete(item.bucket(), item.objectKey(), current.get().versionId());
                deleted++;
            } catch (RuntimeException failure) {
                failed++;
                log.warn("Could not prune orphan object {}: {}", item.objectKey(), failure.getMessage());
            }
        }
        return new ArtifactOrphanReport(examined, deleted, failed);
    }

    private boolean isReferenced(String bucket, String objectKey) {
        return models.existsByStorageBucketAndStorageObjectKey(bucket, objectKey);
    }

    private boolean isManagedArtifact(String objectKey) {
        return objectKey.startsWith("organizations/")
                && objectKey.contains("/models/")
                && objectKey.contains("/artifacts/");
    }

    private boolean isOlderThan(StoredObjectItem item, OffsetDateTime cutoff) {
        return item.lastModified() != null && item.lastModified().isBefore(cutoff);
    }
}
