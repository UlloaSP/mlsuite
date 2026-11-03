package dev.ulloasp.mlsuite.admin.alert;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import lombok.RequiredArgsConstructor;

/** Forgets alerts resolved longer ago than the retention period, once an hour. Open ones stay. */
@Component
@RequiredArgsConstructor
public class SystemAlertRetention {

    private static final Logger log = LoggerFactory.getLogger(SystemAlertRetention.class);

    private final SystemAlertLedger ledger;
    private final AuditLogService auditLog;
    private final AlertSettings settings;

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1M")
    public void prune() {
        OffsetDateTime cutoff = OffsetDateTime.now(ZoneOffset.UTC).minusDays(settings.retentionDays());
        int removed = 0;
        int batch;
        do {
            batch = ledger.prune(cutoff, settings.retentionBatchSize());
            removed += batch;
        } while (batch == settings.retentionBatchSize());
        if (removed > 0) {
            log.info("Removed {} system alerts resolved over {} days ago", removed, settings.retentionDays());
            auditLog.record(AuditActor.SYSTEM, null, AuditAction.SYSTEM_ALERT_RETENTION_PRUNE, null,
                    AuditDetails.of("removed", removed, "retentionDays", settings.retentionDays()));
        }
    }
}
