package dev.ulloasp.mlsuite.storage;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StorageDeletionQueue {

    private final StorageDeletionTaskRepository tasks;

    /** {@code organizationId} is whose object it is, kept to say so if the deletion fails for good. */
    public void enqueue(Long organizationId, String bucket, String objectKey, String versionId) {
        tasks.save(new StorageDeletionTask(organizationId, bucket, objectKey, versionId));
    }

    public boolean isDeletionRequested(String bucket, String objectKey) {
        return tasks.existsByBucketAndObjectKey(bucket, objectKey);
    }
}
