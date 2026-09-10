package dev.ulloasp.mlsuite.schema.application.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultFeedbackRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class PredictionRunServiceImpl implements PredictionRunUseCase {

    private final UserLookupService userLookupService;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final PredictionResultFeedbackRepository feedbackRepository;
    private final ModelRepository modelRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public PredictionRunServiceImpl(UserLookupService userLookupService, SchemaBookmarkRepository bookmarkRepository,
            SchemaModelBindingRepository bindingRepository,
            PredictionRunRepository runRepository, PredictionResultRepository resultRepository,
            PredictionResultFeedbackRepository feedbackRepository, ModelRepository modelRepository,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.bookmarkRepository = bookmarkRepository;
        this.bindingRepository = bindingRepository;
        this.runRepository = runRepository;
        this.resultRepository = resultRepository;
        this.feedbackRepository = feedbackRepository;
        this.modelRepository = modelRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public PredictionRun createRunForBookmark(Long userId, Long schemaBookmarkId, CreatePredictionRunRequest request) {
        User user = userLookupService.requireById(userId);
        Long organizationId = requireRunPredictions(userId);
        SchemaBookmark bookmark = requireBookmark(schemaBookmarkId, organizationId);
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
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireModelView(userId, organizationId);
        return organizationId;
    }

    private Long requireRunPredictions(Long userId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireRunPredictions(userId, organizationId);
        return organizationId;
    }

    private SchemaBookmark requireBookmark(Long schemaBookmarkId, Long organizationId) {
        return bookmarkRepository.findByIdAndOrganizationId(schemaBookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
    }

    private PredictionRun createRun(Long organizationId, User user, SchemaBookmark bookmark, SchemaVersion version,
            CreatePredictionRunRequest request) {
        if (runRepository.existsBySchemaVersionIdAndName(version.getId(), request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prediction run name already exists");
        }
        List<SchemaModelBinding> bindings = bindingRepository.findBySchemaVersionId(version.getId());
        validateResults(bindings, request.results());
        PredictionRun candidate = new PredictionRun(bookmark, version, request.name(),
                request.inputData(), aggregateStatus(request.results()));
        candidate.setCreatedByName(user.getFullName());
        candidate.setCreatedByEmail(user.getEmail());
        PredictionRun run = runRepository.save(candidate);
        request.results().forEach(item -> {
            PredictionResult result = saveResult(organizationId, run, item);
            item.feedback().forEach(feedback -> feedbackRepository.save(new PredictionResultFeedback(
                    result, user, feedback.type(), feedback.order(), feedback.value())));
        });
        return run;
    }

    private void validateResults(List<SchemaModelBinding> bindings, List<CreatePredictionResultRequest> results) {
        Set<String> bound = new HashSet<>();
        bindings.forEach(binding -> bound.add(key(binding.getModel().getId())));
        Set<String> submitted = new HashSet<>();
        for (CreatePredictionResultRequest result : results) {
            String key = key(result.modelId());
            if (!bound.contains(key)) {
                throw badRequest("Prediction result references an unbound model");
            }
            if (!submitted.add(key)) {
                throw badRequest("Duplicate prediction result for model");
            }
            Set<String> feedbackKeys = new HashSet<>();
            result.feedback().forEach(feedback -> {
                if (!feedbackKeys.add(feedback.type() + ":" + feedback.order())) {
                    throw badRequest("Duplicate prediction feedback type and order");
                }
            });
        }
        if (!submitted.equals(bound)) {
            throw badRequest("Prediction run must include one result for every schema binding");
        }
    }

    private PredictionRunStatus aggregateStatus(List<CreatePredictionResultRequest> results) {
        long successCount = results.stream().filter(r -> r.status() == PredictionResultStatus.SUCCESS).count();
        if (successCount == results.size()) {
            return PredictionRunStatus.SUCCESS;
        }
        return successCount == 0 ? PredictionRunStatus.FAILED : PredictionRunStatus.PARTIAL_SUCCESS;
    }

    private PredictionResult saveResult(Long orgId, PredictionRun run, CreatePredictionResultRequest request) {
        Model model = modelRepository.findByIdAndOrganizationId(request.modelId(), orgId)
                .orElseThrow(() -> badRequest("Model unavailable"));
        return resultRepository.save(new PredictionResult(run, model,
                request.modelInput() == null ? Map.of() : request.modelInput(),
                request.output() == null ? Map.of() : request.output(),
                request.status(),
                request.errorMessage(),
                request.errorJson()));
    }

    private String key(Long modelId) {
        return modelId.toString();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
