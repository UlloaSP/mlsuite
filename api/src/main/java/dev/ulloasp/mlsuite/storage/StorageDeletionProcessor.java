package dev.ulloasp.mlsuite.storage;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;

@Service
@ConditionalOnProperty(name = "storage.deletion.enabled", havingValue = "true", matchIfMissing = true)
public class StorageDeletionProcessor {

    private final StorageDeletionWorkQueue queue;
    private final ObjectStorageService objectStorage;
    private final AuditLogService auditLog;
    private final int maxAttempts;
    private final int batchSize;
    private final long staleAfterSeconds;

    public StorageDeletionProcessor(
            StorageDeletionWorkQueue queue,
            ObjectStorageService objectStorage,
            AuditLogService auditLog,
            @Value("${storage.deletion.max-attempts:10}") int maxAttempts,
            @Value("${storage.deletion.batch-size:20}") int batchSize,
            @Value("${storage.deletion.stale-after-seconds:300}") long staleAfterSeconds) {
        this.queue = queue;
        this.objectStorage = objectStorage;
        this.auditLog = auditLog;
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
            objectStorage.delete(item.bucket(), item.objectKey(), null);
            queue.complete(item.id(), leaseToken);
        } catch (RuntimeException ex) {
            String error = truncate(ex.getMessage());
            if (queue.fail(item.id(), leaseToken, error, maxAttempts)) {
                auditLog.record(AuditActor.SYSTEM, item.organizationId(), AuditAction.STORAGE_DELETION_FAILED, item.id(),
                        AuditDetails.of("bucket", item.bucket(), "objectKey", item.objectKey(),
                                "attempts", maxAttempts, "reason", error));
            }
        }
    }

    private String truncate(String message) {
        String value = message == null ? "Unknown deletion failure" : message;
        return value.substring(0, Math.min(value.length(), 1000));
    }

}
