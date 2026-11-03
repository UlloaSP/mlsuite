package dev.ulloasp.mlsuite.schema.job;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.schema.job.PredictionJobLedger.FinishedJob;
import lombok.RequiredArgsConstructor;

/**
 * Ends a job, records it and tells the member who started it, in one transaction. Only the
 * statement that actually ends the job reports it, so a worker that lost its lease or a job
 * cancelled meanwhile reports nothing, and a job that runs again after a retry reports its new end.
 */
@Service
@RequiredArgsConstructor
class PredictionJobOutcomes {

    private static final String STOPPED = "The bulk upload could not go on";

    private final PredictionJobLedger ledger;
    private final NotificationService notifications;
    private final AuditLogService auditLog;

    @Transactional
    void complete(Long jobId, String worker) {
        ledger.complete(jobId, worker).ifPresent(job -> {
            record(job, null);
            tell(job, job.failedRows() > 0
                    ? NotificationKind.PREDICTION_JOB_COMPLETED_WITH_FAILURES
                    : NotificationKind.PREDICTION_JOB_COMPLETED, Map.of());
        });
    }

    /** The system ends a job it cannot go on with: the rows still to run fail with the reason. */
    @Transactional
    void stop(Long jobId, String worker, String reason) {
        if (!ledger.holds(jobId, worker)) return;
        String told = Objects.requireNonNullElse(reason, STOPPED);
        ledger.failPending(jobId, told);
        ledger.complete(jobId, worker).ifPresent(job -> {
            record(job, told);
            tell(job, NotificationKind.PREDICTION_JOB_STOPPED, Map.of("reason", told));
        });
    }

    /** Runs in the transaction that cancelled the job; a member cancelling their own is not told. */
    void cancelled(FinishedJob job, Long actorUserId, String actorName) {
        if (actorUserId.equals(job.userId())) return;
        tell(job, NotificationKind.PREDICTION_JOB_CANCELLED, Map.of("actorName", actorName));
    }

    private void record(FinishedJob job, String stoppedBecause) {
        auditLog.record(AuditActor.SYSTEM, job.organizationId(), AuditAction.PREDICTION_JOB_COMPLETED, job.id(),
                AuditDetails.of("doneRows", job.doneRows(), "failedRows", job.failedRows(), "stopped", stoppedBecause));
    }

    private void tell(FinishedJob job, NotificationKind kind, Map<String, Object> details) {
        if (job.userId() == null) return;
        Map<String, Object> payload = new LinkedHashMap<>(details);
        payload.put("organizationName", job.organizationName());
        payload.put("bookmarkId", job.bookmarkId());
        payload.put("bookmarkName", job.bookmarkName());
        payload.put("totalRows", job.totalRows());
        payload.put("doneRows", job.doneRows());
        payload.put("failedRows", job.failedRows());
        notifications.notify(job.userId(), job.organizationId(), kind, job.id().toString(), payload);
    }
}
