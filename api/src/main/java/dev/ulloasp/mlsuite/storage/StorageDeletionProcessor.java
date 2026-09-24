package dev.ulloasp.mlsuite.storage;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "storage.deletion.enabled", havingValue = "true", matchIfMissing = true)
public class StorageDeletionProcessor {

    private final StorageDeletionWorkQueue queue;
    private final ObjectStorageService objectStorage;
    private final int maxAttempts;
    private final int batchSize;
    private final long staleAfterSeconds;

    public StorageDeletionProcessor(
            StorageDeletionWorkQueue queue,
            ObjectStorageService objectStorage,
            @Value("${storage.deletion.max-attempts:10}") int maxAttempts,
            @Value("${storage.deletion.batch-size:20}") int batchSize,
            @Value("${storage.deletion.stale-after-seconds:300}") long staleAfterSeconds) {
        this.queue = queue;
        this.objectStorage = objectStorage;
        this.maxAttempts = maxAttempts;
        this.batchSize = batchSize;
        this.staleAfterSeconds = staleAfterSeconds;
    }

    @Scheduled(fixedDelayString = "${storage.deletion.delay-ms:30000}")
    public void processPending() {
        String leaseToken = UUID.randomUUID().toString();
        for (StorageDeletionWorkItem item : queue.claim(batchSize, staleAfterSeconds, leaseToken)) {
            process(item, leaseToken);
        }
    }

    private void process(StorageDeletionWorkItem item, String leaseToken) {
        try {
            // Delete the current key, not a concrete version. On a versioned bucket this
            // creates a delete marker and preserves rollback data until lifecycle expiry.
            objectStorage.delete(item.bucket(), item.objectKey());
            queue.complete(item.id(), leaseToken);
        } catch (RuntimeException ex) {
            queue.fail(item.id(), leaseToken, truncate(ex.getMessage()), maxAttempts);
        }
    }

    private String truncate(String message) {
        String value = message == null ? "Unknown deletion failure" : message;
        return value.substring(0, Math.min(value.length(), 1000));
    }

}
