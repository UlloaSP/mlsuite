package dev.ulloasp.mlsuite.schema.job;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.model.application.service.WorkspaceRuntimeSlots;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.service.AttestedPrediction;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import dev.ulloasp.mlsuite.schema.application.service.WorkspacePredictionPlanner;
import dev.ulloasp.mlsuite.schema.application.service.WorkspacePredictionPlanner.Plan;
import dev.ulloasp.mlsuite.schema.application.service.WorkspacePredictionService;
import dev.ulloasp.mlsuite.schema.domain.exception.RuntimeBusyException;
import dev.ulloasp.mlsuite.schema.job.PredictionJobLedger.Claim;
import dev.ulloasp.mlsuite.schema.job.PredictionJobLedger.PendingRow;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/**
 * Runs bulk jobs on the server, so an upload goes on after its tab is closed. Each API instance
 * claims one open job at a time (PredictionJobLedger) and runs it a chunk of rows at a time: every
 * bound model predicts the chunk in one runtime call, in a slot of the workspace share taken as the
 * member who started the job, so a job queues with that member's other runs; the chunk's runs are
 * then stored. A busy runtime hands the job back to be claimed again; a member who may no longer
 * run predictions, or a bookmark moved to another snapshot, fails the rows still to run.
 */
@Component
class PredictionJobWorker {

    private static final Logger log = LoggerFactory.getLogger(PredictionJobWorker.class);

    private final String worker = "api-" + UUID.randomUUID();
    private final PredictionJobLedger ledger;
    private final PredictionJobChunks chunks;
    private final WorkspacePredictionPlanner planner;
    private final WorkspacePredictionService predictions;
    private final WorkspaceRuntimeSlots slots;
    private final WorkspaceAuthorizationService authorization;
    private final SchemaModelBindingRepository bindings;
    private final AuditLogService auditLog;
    private final int chunkRows;
    private final int leaseSeconds;

    PredictionJobWorker(PredictionJobLedger ledger, PredictionJobChunks chunks, WorkspacePredictionPlanner planner,
            WorkspacePredictionService predictions, WorkspaceRuntimeSlots slots,
            WorkspaceAuthorizationService authorization, SchemaModelBindingRepository bindings,
            AuditLogService auditLog,
            @Value("${mlsuite.prediction-jobs.chunk-rows}") int chunkRows,
            @Value("${mlsuite.prediction-jobs.lease-seconds}") int leaseSeconds) {
        this.ledger = ledger;
        this.chunks = chunks;
        this.planner = planner;
        this.predictions = predictions;
        this.slots = slots;
        this.authorization = authorization;
        this.bindings = bindings;
        this.auditLog = auditLog;
        this.chunkRows = chunkRows;
        this.leaseSeconds = leaseSeconds;
    }

    @Scheduled(fixedDelayString = "${mlsuite.prediction-jobs.poll-ms}")
    void work() {
        Optional<Claim> claimed;
        while ((claimed = ledger.claim(worker, leaseSeconds)).isPresent()) {
            Claim job = claimed.get();
            if (job.started()) {
                auditLog.record(AuditActor.SYSTEM, job.organizationId(), AuditAction.PREDICTION_JOB_CLAIMED, job.id(),
                        AuditDetails.of("bookmarkId", job.bookmarkId()));
            }
            try {
                run(job);
            } catch (RuntimeBusyException busy) {
                ledger.release(job.id(), worker);
                return;
            } catch (RuntimeException failure) {
                log.error("Bulk job {} stopped; it is claimed again when its lease ends", job.id(), failure);
                ledger.release(job.id(), worker);
                return;
            }
        }
    }

    /** Runs the job's pending rows chunk by chunk, until none is left or the job is no longer ours. */
    void run(Claim job) {
        while (true) {
            List<PendingRow> rows = ledger.pending(job.id(), chunkRows);
            if (rows.isEmpty()) {
                finish(job, null);
                return;
            }
            if (!authorization.has(job.userId(), job.organizationId(), PermissionKey.RUN_PREDICTIONS)) {
                stop(job, "The member who started the upload may no longer run predictions");
                return;
            }
            Map<Long, List<AttestedPrediction>> byModel = new LinkedHashMap<>();
            try {
                for (Long modelId : boundModels(job)) {
                    Plan plan = planner.planFor(job.organizationId(), job.bookmarkId(), job.schemaVersionId(), modelId);
                    List<Map<String, Object>> inputs = rows.stream()
                            .map(row -> row.models().getOrDefault(modelId, Map.of())).toList();
                    try (RuntimeSlots.Admission admission = slots.admit(job.userId())) {
                        byModel.put(modelId, admission.run(() -> predictions.predictRows(plan, inputs)));
                    }
                }
            } catch (RuntimeBusyException busy) {
                throw busy;
            } catch (ResponseStatusException unplannable) {
                stop(job, unplannable.getReason());
                return;
            }
            if (!chunks.store(job, worker, rows, byModel)) {
                if (ledger.cancelled(job.id())) {
                    auditLog.record(AuditActor.SYSTEM, job.organizationId(), AuditAction.PREDICTION_JOB_CANCELLED,
                            job.id());
                }
                return;
            }
        }
    }

    private List<Long> boundModels(Claim job) {
        return bindings.findBySchemaVersionId(job.schemaVersionId()).stream()
                .map(binding -> binding.getModel().getId()).toList();
    }

    private void stop(Claim job, String reason) {
        ledger.failPending(job.id(), reason);
        finish(job, reason);
    }

    private void finish(Claim job, String stoppedBecause) {
        ledger.complete(job.id(), worker).ifPresent(outcome -> auditLog.record(AuditActor.SYSTEM, job.organizationId(),
                AuditAction.PREDICTION_JOB_COMPLETED, job.id(), AuditDetails.of("doneRows", outcome.doneRows(),
                        "failedRows", outcome.failedRows(), "stopped", stoppedBecause)));
    }
}
