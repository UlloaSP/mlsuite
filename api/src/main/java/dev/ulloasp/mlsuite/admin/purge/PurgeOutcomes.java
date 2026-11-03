package dev.ulloasp.mlsuite.admin.purge;

import java.util.Map;

import org.springframework.core.NestedExceptionUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;

/**
 * Ends a purge, records it and tells who asked, in one transaction. Completing also deletes the
 * organization or the user: the entry is written first, so it still reads their names.
 */
@Service
@RequiredArgsConstructor
class PurgeOutcomes {

    private static final int MAX_ERROR = 2000;

    private final PurgeLedger ledger;
    private final PurgeAccountSteps account;
    private final AuditLogService auditLog;
    private final NotificationService notifications;
    private final UserRepository users;
    private final JdbcTemplate jdbc;

    /** False when the job is no longer this worker's. */
    @Transactional
    boolean complete(PurgeJob job, String worker, int leaseSeconds) {
        if (!ledger.renew(job.id(), worker, leaseSeconds)) return false;
        Map<String, Long> counts = ledger.find(job.id()).orElseThrow().counts();
        auditLog.record(AuditActor.SYSTEM, job.organizationId(), AuditAction.PURGE_COMPLETED, job.id(),
                AuditDetails.of("scope", job.scope(), "targetId", job.targetId(), "target", job.targetLabel(),
                        "counts", counts));
        if (job.scope().ownsOrganization()) {
            jdbc.update("DELETE FROM organization WHERE id = ?", job.organizationId());
        }
        if (job.scope() == PurgeScope.USER) {
            account.deleteUser(job.targetId());
        }
        ledger.finish(job.id());
        tell(job, NotificationKind.PURGE_COMPLETED, Map.of("scope", job.scope(), "targetLabel", job.targetLabel()));
        return true;
    }

    @Transactional
    void fail(PurgeJob job, String worker, RuntimeException failure) {
        String reason = bounded(NestedExceptionUtils.getMostSpecificCause(failure).getMessage());
        if (!ledger.fail(job.id(), worker, reason)) return;
        auditLog.record(AuditActor.SYSTEM, job.organizationId(), AuditAction.PURGE_FAILED, job.id(),
                AuditDetails.of("scope", job.scope(), "targetId", job.targetId(), "target", job.targetLabel(),
                        "reason", reason, "counts", ledger.find(job.id()).orElseThrow().counts()));
        tell(job, NotificationKind.PURGE_FAILED, Map.of("scope", job.scope(), "targetLabel", job.targetLabel(),
                "reason", reason));
    }

    /** Nobody is told of a purge they asked for of their own account, or once they are gone. */
    private void tell(PurgeJob job, NotificationKind kind, Map<String, Object> payload) {
        Long requester = job.requestedBy();
        boolean own = job.scope() == PurgeScope.USER && job.targetId().equals(requester);
        if (requester != null && !own && users.existsById(requester)) {
            notifications.notify(requester, null, kind, job.id().toString(), payload);
        }
    }

    private static String bounded(String reason) {
        String text = reason == null || reason.isBlank() ? "The purge stopped unexpectedly" : reason;
        return text.length() <= MAX_ERROR ? text : text.substring(0, MAX_ERROR - 1) + "…";
    }
}
