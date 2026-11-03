package dev.ulloasp.mlsuite.storage;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;

/** Forgets deletions that completed longer ago than the retention period, once an hour. */
@Component
@ConditionalOnProperty(name = "storage.deletion.enabled", havingValue = "true", matchIfMissing = true)
public class StorageDeletionRetention {

    private static final Logger log = LoggerFactory.getLogger(StorageDeletionRetention.class);

    private final StorageDeletionWorkQueue queue;
    private final AuditLogService auditLog;
    private final int retentionDays;
    private final int batchSize;

    public StorageDeletionRetention(StorageDeletionWorkQueue queue, AuditLogService auditLog,
            @Value("${storage.deletion.retention-days:7}") int retentionDays,
            @Value("${storage.deletion.retention-batch-size:1000}") int batchSize) {
        if (retentionDays < 1) {
            throw new IllegalArgumentException("storage.deletion.retention-days must be at least 1.");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("storage.deletion.retention-batch-size must be at least 1.");
        }
        this.queue = queue;
        this.auditLog = auditLog;
        this.retentionDays = retentionDays;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1M")
    public void prune() {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusDays(retentionDays);
        int removed = 0;
        int batch;
        do {
            batch = queue.pruneCompleted(cutoff, batchSize);
            removed += batch;
        } while (batch == batchSize);
        if (removed > 0) {
            log.info("Forgot {} storage deletions completed over {} days ago", removed, retentionDays);
            auditLog.record(AuditActor.SYSTEM, null, AuditAction.STORAGE_DELETION_RETENTION_PRUNE, null,
                    AuditDetails.of("removed", removed, "retentionDays", retentionDays));
        }
    }
}
