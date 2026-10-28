package dev.ulloasp.mlsuite.schema.application.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * Stores a run of predictions the server performed, whether a member saves them (opened from
 * their seals) or a bulk job ran them: one result per model the snapshot binds, each stored
 * exactly as produced, for the bookmark's current snapshot and under a name the snapshot has not
 * used. The caller's transaction holds the run and its results together.
 */
@Component
@RequiredArgsConstructor
public class PredictionRunStore {

    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final ModelRepository modelRepository;

    public PredictionRun store(Long organizationId, User author, SchemaBookmark bookmark, String name,
            Map<String, Object> inputData, List<AttestedPrediction> results) {
        SchemaVersion version = bookmark.getVersion();
        if (runRepository.existsBySchemaVersionIdAndName(version.getId(), name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prediction run name already exists: " + name);
        }
        results.forEach(result -> {
            if (!result.organizationId().equals(organizationId) || !result.schemaVersionId().equals(version.getId())) {
                throw badRequest("A prediction result was produced for another snapshot; run the inference again");
            }
        });
        validateResults(bindingRepository.findBySchemaVersionId(version.getId()), results);
        PredictionRun candidate = new PredictionRun(bookmark, version, name, inputData, aggregateStatus(results));
        candidate.setCreatedByName(author.getFullName());
        candidate.setCreatedByEmail(author.getEmail());
        PredictionRun run = runRepository.save(candidate);
        results.forEach(result -> saveResult(organizationId, run, result));
        return run;
    }

    private void validateResults(List<SchemaModelBinding> bindings, List<AttestedPrediction> results) {
        Set<Long> bound = new HashSet<>();
        bindings.forEach(binding -> bound.add(binding.getModel().getId()));
        Set<Long> submitted = new HashSet<>();
        for (AttestedPrediction result : results) {
            if (!bound.contains(result.modelId())) {
                throw badRequest("Prediction result references an unbound model");
            }
            if (!submitted.add(result.modelId())) {
                throw badRequest("Duplicate prediction result for model");
            }
        }
        if (!submitted.equals(bound)) {
            throw badRequest("Prediction run must include one result for every schema binding");
        }
    }

    private PredictionRunStatus aggregateStatus(List<AttestedPrediction> results) {
        long successCount = results.stream().filter(r -> r.status() == PredictionResultStatus.SUCCESS).count();
        if (successCount == results.size()) {
            return PredictionRunStatus.SUCCESS;
        }
        return successCount == 0 ? PredictionRunStatus.FAILED : PredictionRunStatus.PARTIAL_SUCCESS;
    }

    private void saveResult(Long organizationId, PredictionRun run, AttestedPrediction result) {
        Model model = modelRepository.findByIdAndOrganizationId(result.modelId(), organizationId)
                .orElseThrow(() -> badRequest("Model unavailable"));
        resultRepository.save(new PredictionResult(run, model, result.modelInput(), result.output(),
                result.status(), result.errorMessage(), result.errorJson()));
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
