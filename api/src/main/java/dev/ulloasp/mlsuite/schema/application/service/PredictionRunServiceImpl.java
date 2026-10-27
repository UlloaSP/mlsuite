package dev.ulloasp.mlsuite.schema.application.service;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class PredictionRunServiceImpl implements PredictionRunUseCase {

    private final UserLookupService userLookupService;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final PredictionResultFeedbackRepository feedbackRepository;
    private final ModelRepository modelRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final PredictionAttestations attestations;

    @Override
    public PredictionRun createRunForBookmark(Long userId, Long schemaBookmarkId, CreatePredictionRunRequest request) {
        User user = userLookupService.requireById(userId);
        Long organizationId = requireRunPredictions(userId);
        SchemaBookmark bookmark = requireBookmark(schemaBookmarkId, organizationId);
        if (!bookmark.getVersion().getId().equals(request.schemaVersionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The bookmark moved to another snapshot; reload before saving");
        }
        return createRun(organizationId, user, bookmark, bookmark.getVersion(), request);
    }

    @Override
    public List<PredictionRun> listRunsForBookmark(Long userId, Long schemaBookmarkId) {
        Long organizationId = requireRead(userId);
        requireBookmark(schemaBookmarkId, organizationId);
        return runRepository.findBySchemaBookmarkIdAndOrganizationId(schemaBookmarkId, organizationId);
    }

    @Override
    public List<PredictionRun> listOrganizationRuns(Long userId) {
        return runRepository.findByOrganizationIdOrderByCreatedAtDesc(requireRead(userId));
    }

    @Override
    public InferenceTableDto getOrganizationInferenceTable(Long userId) {
        Long organizationId = requireRead(userId);
        List<PredictionRun> runs = runRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId);
        Map<Long, SchemaVersion> versions = new LinkedHashMap<>();
        runs.forEach(run -> versions.putIfAbsent(run.getSchemaVersion().getId(), run.getSchemaVersion()));
        Map<Long, List<SchemaModelBinding>> bindings = versions.isEmpty() ? Map.of()
                : bindingRepository.findBySchemaVersionIdIn(versions.keySet()).stream()
                        .collect(Collectors.groupingBy(binding -> binding.getSchemaVersion().getId()));
        return new InferenceTableDto(
                runs.stream().map(InferenceTableRunDto::from).toList(),
                PredictionResultDto.fromList(resultRepository.findByOrganizationId(organizationId)),
                PredictionResultFeedbackDto.fromList(feedbackRepository.findByOrganizationId(organizationId)),
                versions.values().stream()
                        .map(version -> SchemaVersionDto.from(version, bindings.getOrDefault(version.getId(), List.of())))
                        .toList());
    }

    @Override
    public PredictionRun getRun(Long userId, Long runId) {
        Long organizationId = requireRead(userId);
        return runRepository.findByIdAndOrganizationId(runId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found"));
    }

    @Override
    public void deleteRun(Long userId, Long runId) {
        Long organizationId = requireRunPredictions(userId);
        PredictionRun run = runRepository.findByIdAndOrganizationId(runId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found"));
        if (runRepository.isIncludedInReview(runId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Inference cannot be deleted while it belongs to a review");
        }
        feedbackRepository.deleteByResult_Run_Id(runId);
        resultRepository.deleteByRun_Id(runId);
        runRepository.delete(run);
    }

    @Override
    public Long getLastPredictionRunId(Long userId) {
        requireRunPredictions(userId);
        return runRepository.findLastPredictionRunId();
    }

    private Long requireRead(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
    }

    private Long requireRunPredictions(Long userId) {
        return authorizationService.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
    }

    private SchemaBookmark requireBookmark(Long schemaBookmarkId, Long organizationId) {
        return bookmarkRepository.findByIdAndOrganizationId(schemaBookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
    }

    /**
     * A run keeps only results the server produced: each one is opened from its seal, which must
     * be for this organization and snapshot, and stored exactly as sealed.
     */
    private PredictionRun createRun(Long organizationId, User user, SchemaBookmark bookmark, SchemaVersion version,
            CreatePredictionRunRequest request) {
        if (runRepository.existsBySchemaVersionIdAndName(version.getId(), request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prediction run name already exists");
        }
        List<AttestedPrediction> results = request.results().stream()
                .map(result -> attestations.open(result.attestation()))
                .toList();
        results.forEach(result -> {
            if (!result.organizationId().equals(organizationId) || !result.schemaVersionId().equals(version.getId())) {
                throw badRequest("A prediction result was produced for another snapshot; run the inference again");
            }
        });
        validateResults(bindingRepository.findBySchemaVersionId(version.getId()), results);
        PredictionRun candidate = new PredictionRun(bookmark, version, request.name(),
                request.inputData(), aggregateStatus(results));
        candidate.setCreatedByName(user.getFullName());
        candidate.setCreatedByEmail(user.getEmail());
        PredictionRun run = runRepository.save(candidate);
        results.forEach(result -> saveResult(organizationId, run, result));
        return run;
    }

    private void validateResults(List<SchemaModelBinding> bindings, List<AttestedPrediction> results) {
        Set<String> bound = new HashSet<>();
        bindings.forEach(binding -> bound.add(key(binding.getModel().getId())));
        Set<String> submitted = new HashSet<>();
        for (AttestedPrediction result : results) {
            String key = key(result.modelId());
            if (!bound.contains(key)) {
                throw badRequest("Prediction result references an unbound model");
            }
            if (!submitted.add(key)) {
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

    private void saveResult(Long orgId, PredictionRun run, AttestedPrediction result) {
        Model model = modelRepository.findByIdAndOrganizationId(result.modelId(), orgId)
                .orElseThrow(() -> badRequest("Model unavailable"));
        resultRepository.save(new PredictionResult(run, model, result.modelInput(), result.output(),
                result.status(), result.errorMessage(), result.errorJson()));
    }

    private String key(Long modelId) {
        return modelId.toString();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
