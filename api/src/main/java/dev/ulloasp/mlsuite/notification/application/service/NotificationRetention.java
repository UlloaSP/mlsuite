package dev.ulloasp.mlsuite.notification.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.notification.adapter.out.persistence.repository.NotificationRepository;

/** Forgets notifications read longer ago than the retention period, once an hour. Unread ones stay. */
@Component
public class NotificationRetention {

    private static final Logger log = LoggerFactory.getLogger(NotificationRetention.class);

    private final NotificationRepository notifications;
    private final AuditLogService auditLog;
    private final int retentionDays;
    private final int batchSize;

    public NotificationRetention(NotificationRepository notifications, AuditLogService auditLog,
            @Value("${mlsuite.notifications.retention-days}") int retentionDays,
            @Value("${mlsuite.notifications.retention-batch-size}") int batchSize) {
        if (retentionDays < 1) {
            throw new IllegalArgumentException("NOTIFICATIONS_RETENTION_DAYS must be at least 1.");
        }
        if (batchSize < 1) {
            throw new IllegalArgumentException("mlsuite.notifications.retention-batch-size must be at least 1.");
        }
        this.notifications = notifications;
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
            batch = notifications.deleteReadBefore(cutoff, batchSize);
            removed += batch;
        } while (batch == batchSize);
        if (removed > 0) {
            log.info("Removed {} notifications read over {} days ago", removed, retentionDays);
            auditLog.record(AuditActor.SYSTEM, null, AuditAction.NOTIFICATION_RETENTION_PRUNE, null,
                    AuditDetails.of("removed", removed, "retentionDays", retentionDays));
        }
    }
}
