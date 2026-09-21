package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "storage.deletion.enabled", havingValue = "true", matchIfMissing = true)
public class StorageDeletionProcessor {

    private final StorageDeletionTaskRepository tasks;
    private final ObjectStorageService objectStorage;
    private final int maxAttempts;

    public StorageDeletionProcessor(
            StorageDeletionTaskRepository tasks,
            ObjectStorageService objectStorage,
            @Value("${storage.deletion.max-attempts:10}") int maxAttempts) {
        this.tasks = tasks;
        this.objectStorage = objectStorage;
        this.maxAttempts = maxAttempts;
    }

    @Scheduled(fixedDelayString = "${storage.deletion.delay-ms:30000}")
    @Transactional
    public void processPending() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (StorageDeletionTask task : tasks
                .findTop20ByStatusAndNextAttemptAtBeforeOrderByIdAsc(StorageDeletionStatus.PENDING, now)) {
            process(task, now);
        }
    }

    private void process(StorageDeletionTask task, OffsetDateTime now) {
        try {
            // Delete the current key, not a concrete version. On a versioned bucket this
            // creates a delete marker and preserves rollback data until lifecycle expiry.
            objectStorage.delete(task.getBucket(), task.getObjectKey());
            task.setStatus(StorageDeletionStatus.COMPLETED);
            task.setCompletedAt(now);
            task.setLastError(null);
        } catch (RuntimeException ex) {
            int attempts = task.getAttempts() + 1;
            task.setAttempts(attempts);
            task.setLastError(truncate(ex.getMessage()));
            if (attempts >= maxAttempts) {
                task.setStatus(StorageDeletionStatus.FAILED);
            } else {
                task.setNextAttemptAt(now.plusSeconds(Math.min(3600L, 1L << Math.min(attempts, 10))));
            }
        }
        tasks.save(task);
    }

    private String truncate(String message) {
        String value = message == null ? "Unknown deletion failure" : message;
        return value.substring(0, Math.min(value.length(), 1000));
    }
}
