package dev.ulloasp.mlsuite.schema.job;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.service.AttestedPrediction;
import dev.ulloasp.mlsuite.schema.application.service.PredictionRunStore;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.job.PredictionJobLedger.Claim;
import dev.ulloasp.mlsuite.schema.job.PredictionJobLedger.PendingRow;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * Stores what a chunk of a job's rows gave, in one transaction with the rows' outcome: a row whose
 * every model answered becomes a stored run, as a member's saved run is stored
 * (PredictionRunStore); a row any model failed on stores nothing and keeps the models' reasons, so
 * running it again cannot store it twice. Nothing is stored once the job was cancelled or its lease
 * passed to another worker.
 */
@Service
@RequiredArgsConstructor
class PredictionJobChunks {

    private final PredictionJobLedger ledger;
    private final PredictionRunStore runStore;
    private final SchemaBookmarkRepository bookmarks;
    private final SchemaModelBindingRepository bindings;
    private final UserRepository users;
    @Value("${mlsuite.prediction-jobs.lease-seconds}")
    private int leaseSeconds;

    /** False when the worker no longer holds the job. */
    @Transactional
    boolean store(Claim job, String worker, List<PendingRow> rows, Map<Long, List<AttestedPrediction>> byModel) {
        if (!ledger.holds(job.id(), worker)) return false;
        SchemaBookmark bookmark = bookmarks.findByIdAndOrganizationId(job.bookmarkId(), job.organizationId()).orElse(null);
        User author = job.userId() == null ? null : users.findById(job.userId()).orElse(null);
        Map<Long, String> names = new HashMap<>();
        bindings.findBySchemaVersionId(job.schemaVersionId())
                .forEach(binding -> names.put(binding.getModel().getId(), binding.getModel().getName()));
        for (int index = 0; index < rows.size(); index++) {
            PendingRow row = rows.get(index);
            int at = index;
            List<AttestedPrediction> results = byModel.values().stream().map(answers -> answers.get(at)).toList();
            String failed = results.stream().filter(result -> result.status() == PredictionResultStatus.FAILED)
                    .map(result -> names.getOrDefault(result.modelId(), "Model " + result.modelId()) + ": "
                            + result.errorMessage())
                    .collect(Collectors.joining("; "));
            if (!failed.isEmpty()) {
                ledger.fail(job.id(), row.index(), failed);
            } else if (bookmark == null || author == null
                    || !bookmark.getVersion().getId().equals(job.schemaVersionId())) {
                ledger.fail(job.id(), row.index(), "The bookmark moved to another snapshot or was removed");
            } else {
                try {
                    Long runId = runStore.store(job.organizationId(), author, bookmark, row.name(), row.inputData(),
                            results).getId();
                    ledger.done(job.id(), row.index(), runId);
                } catch (ResponseStatusException refused) {
                    ledger.fail(job.id(), row.index(), refused.getReason());
                }
            }
        }
        ledger.refreshCounts(job.id(), leaseSeconds);
        return true;
    }
}
