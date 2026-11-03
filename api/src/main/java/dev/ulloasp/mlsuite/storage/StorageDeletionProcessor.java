package dev.ulloasp.mlsuite.storage;

import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import jakarta.annotation.PreDestroy;

/**
 * Removes the objects queued for deletion: a task's exact version, or every version of its key. It
 * has a thread of its own rather than {@code @Scheduled}, so a long batch of deletions takes no
 * thread from the scheduler's pool, which is sized for the tasks that run there.
 */
@Service
@ConditionalOnProperty(name = "storage.deletion.enabled", havingValue = "true", matchIfMissing = true)
public class StorageDeletionProcessor {

    private static final Logger log = LoggerFactory.getLogger(StorageDeletionProcessor.class);

    private final StorageDeletionWorkQueue queue;
    private final ObjectStorageService objectStorage;
    private final AuditLogService auditLog;
    private final int maxAttempts;
    private final int batchSize;
    private final long staleAfterSeconds;
    private final long delayMs;
    private final ScheduledExecutorService schedule = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().daemon().name("storage-deletion").factory());

    public StorageDeletionProcessor(
            StorageDeletionWorkQueue queue,
            ObjectStorageService objectStorage,
            AuditLogService auditLog,
            @Value("${storage.deletion.max-attempts:10}") int maxAttempts,
            @Value("${storage.deletion.batch-size:20}") int batchSize,
            @Value("${storage.deletion.stale-after-seconds:300}") long staleAfterSeconds,
            @Value("${storage.deletion.delay-ms:30000}") long delayMs) {
        this.queue = queue;
        this.objectStorage = objectStorage;
        this.auditLog = auditLog;
        this.maxAttempts = maxAttempts;
        this.batchSize = batchSize;
        this.staleAfterSeconds = staleAfterSeconds;
        this.delayMs = delayMs;
    }

    @EventListener(ApplicationReadyEvent.class)
    void start() {
        schedule.scheduleWithFixedDelay(this::processQuietly, delayMs, delayMs, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    void stop() {
        schedule.shutdownNow();
    }

    /** A failed round is logged and the next one still comes: an exception here would end the schedule. */
    private void processQuietly() {
        try {
            processPending();
        } catch (RuntimeException failure) {
            log.error("Could not process the storage deletion queue", failure);
        }
    }

    public void processPending() {
        String leaseToken = UUID.randomUUID().toString();
        for (StorageDeletionWorkItem item : queue.claim(batchSize, staleAfterSeconds, leaseToken)) {
            process(item, leaseToken);
        }
    }

    private void process(StorageDeletionWorkItem item, String leaseToken) {
        try {
            // On a versioned bucket a delete without a version only hides the object behind a marker.
            if (item.versionId() == null) {
                objectStorage.deleteAllVersions(item.bucket(), item.objectKey());
            } else {
                objectStorage.delete(item.bucket(), item.objectKey(), item.versionId());
            }
            queue.complete(item.id(), leaseToken);
        } catch (RuntimeException ex) {
            log.warn("Object {} of {} could not be deleted", item.objectKey(), item.bucket(), ex);
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
