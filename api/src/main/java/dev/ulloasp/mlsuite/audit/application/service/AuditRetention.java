package dev.ulloasp.mlsuite.audit.application.service;

import java.time.OffsetDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;

/**
 * Forgets the entries older than the retention period, once an hour. Each batch commits on its
 * own, so a backlog never holds a long transaction against the writes of prediction runs, and API
 * instances pruning together skip each other's rows.
 */
@Component
public class AuditRetention {

    private static final Logger log = LoggerFactory.getLogger(AuditRetention.class);
    static final int BATCH = 5_000;

    private final JdbcTemplate jdbc;
    private final AuditLogService auditLog;
    private final int retentionDays;

    public AuditRetention(JdbcTemplate jdbc, AuditLogService auditLog,
            @Value("${audit.retention-days}") int retentionDays) {
        if (retentionDays < 1) {
            throw new IllegalArgumentException("AUDIT_RETENTION_DAYS must be at least 1.");
        }
        this.jdbc = jdbc;
        this.auditLog = auditLog;
        this.retentionDays = retentionDays;
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1M")
    public void prune() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(retentionDays);
        long removed = 0;
        int batch;
        do {
            batch = jdbc.update("""
                    DELETE FROM audit_event WHERE id IN (
                        SELECT id FROM audit_event WHERE created_at < ? ORDER BY created_at
                        LIMIT ? FOR UPDATE SKIP LOCKED)""", cutoff, BATCH);
            removed += batch;
        } while (batch == BATCH);
        if (removed > 0) {
            log.info("Removed {} audit entries older than {} days", removed, retentionDays);
            auditLog.record(AuditActor.SYSTEM, null, AuditAction.AUDIT_RETENTION_PRUNE, null,
                    AuditDetails.of("removed", removed, "retentionDays", retentionDays));
        }
    }
}
