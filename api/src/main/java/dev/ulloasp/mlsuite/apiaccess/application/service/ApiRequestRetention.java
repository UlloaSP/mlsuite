package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.time.OffsetDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import lombok.RequiredArgsConstructor;

/** Forgets the calls older than the retention period, once an hour. The runs they made stay. */
@Component
@RequiredArgsConstructor
public class ApiRequestRetention {

    private static final Logger log = LoggerFactory.getLogger(ApiRequestRetention.class);

    private final ApiRequestRepository requests;
    private final ApiAccessSettings settings;
    private final AuditLogService auditLog;

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1M")
    @Transactional
    public void prune() {
        int removed = requests.deleteCreatedBefore(OffsetDateTime.now().minusDays(settings.retentionDays()));
        if (removed > 0) {
            log.info("Removed {} API calls older than {} days", removed, settings.retentionDays());
            auditLog.record(AuditActor.SYSTEM, null, AuditAction.API_REQUEST_RETENTION_PRUNE, null,
                    AuditDetails.of("removed", removed, "retentionDays", settings.retentionDays()));
        }
    }
}
