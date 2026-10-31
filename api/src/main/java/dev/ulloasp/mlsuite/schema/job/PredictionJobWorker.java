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
    private final PredictionJobOutcomes outcomes;
    private final WorkspacePredictionPlanner planner;
    private final WorkspacePredictionService predictions;
    private final WorkspaceRuntimeSlots slots;
    private final WorkspaceAuthorizationService authorization;
    private final SchemaModelBindingRepository bindings;
    private final int chunkRows;
    private final int leaseSeconds;

    PredictionJobWorker(PredictionJobLedger ledger, PredictionJobChunks chunks, PredictionJobOutcomes outcomes,
            WorkspacePredictionPlanner planner, WorkspacePredictionService predictions, WorkspaceRuntimeSlots slots,
            WorkspaceAuthorizationService authorization, SchemaModelBindingRepository bindings,
            @Value("${mlsuite.prediction-jobs.chunk-rows}") int chunkRows,
            @Value("${mlsuite.prediction-jobs.lease-seconds}") int leaseSeconds) {
        this.ledger = ledger;
        this.chunks = chunks;
        this.outcomes = outcomes;
        this.planner = planner;
        this.predictions = predictions;
        this.slots = slots;
        this.authorization = authorization;
        this.bindings = bindings;
        this.chunkRows = chunkRows;
        this.leaseSeconds = leaseSeconds;
    }

    @Scheduled(fixedDelayString = "${mlsuite.prediction-jobs.poll-ms}")
    void work() {
        Optional<Claim> claimed;
        while ((claimed = ledger.claim(worker, leaseSeconds)).isPresent()) {
            Claim job = claimed.get();
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
                outcomes.complete(job.id(), worker);
                return;
            }
            if (!authorization.has(job.userId(), job.organizationId(), PermissionKey.RUN_PREDICTIONS)) {
                outcomes.stop(job.id(), worker, "The member who started the upload may no longer run predictions");
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
                outcomes.stop(job.id(), worker, unplannable.getReason());
                return;
            }
            if (!chunks.store(job, worker, rows, byModel)) return;
        }
    }

    private List<Long> boundModels(Claim job) {
        return bindings.findBySchemaVersionId(job.schemaVersionId()).stream()
                .map(binding -> binding.getModel().getId()).toList();
    }
}
