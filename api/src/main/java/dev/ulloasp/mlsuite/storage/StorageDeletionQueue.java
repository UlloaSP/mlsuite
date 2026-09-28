package dev.ulloasp.mlsuite.storage;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class StorageDeletionQueue {

    private final StorageDeletionTaskRepository tasks;

    public void enqueue(String bucket, String objectKey, String versionId) {
        tasks.save(new StorageDeletionTask(bucket, objectKey, versionId));
    }

    public boolean isDeletionRequested(String bucket, String objectKey) {
        return tasks.existsByBucketAndObjectKey(bucket, objectKey);
    }
}
