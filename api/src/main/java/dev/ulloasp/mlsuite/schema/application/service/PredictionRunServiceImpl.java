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
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultRequest;
import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictionRunUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class PredictionRunServiceImpl implements PredictionRunUseCase {

    private final UserLookupService userLookupService;
    private final SchemaVersionRepository versionRepository;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionRunRepository runRepository;
    private final PredictionResultRepository resultRepository;
    private final ModelRepository modelRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public PredictionRunServiceImpl(UserLookupService userLookupService, SchemaVersionRepository versionRepository,
            SchemaModelBindingRepository bindingRepository, PredictionRunRepository runRepository,
            PredictionResultRepository resultRepository, ModelRepository modelRepository,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.versionRepository = versionRepository;
        this.bindingRepository = bindingRepository;
        this.runRepository = runRepository;
        this.resultRepository = resultRepository;
        this.modelRepository = modelRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public PredictionRun createRun(Long userId, Long schemaVersionId, CreatePredictionRunRequest request) {
        Long organizationId = requireOperate(userId);
        SchemaVersion version = requireVersion(schemaVersionId, organizationId);
        if (runRepository.existsBySchemaVersionIdAndName(schemaVersionId, request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Prediction run name already exists");
        }
        List<SchemaModelBinding> bindings = bindingRepository.findBySchemaVersionId(schemaVersionId);
        validateResults(bindings, request.results());
        PredictionRun run = runRepository.save(new PredictionRun(version, request.name(), request.inputData(),
                aggregateStatus(request.results())));
        request.results().forEach(result -> saveResult(organizationId, run, result));
        return run;
    }

    @Override
    public List<PredictionRun> listRuns(Long userId, Long schemaVersionId) {
        Long organizationId = requireRead(userId);
        requireVersion(schemaVersionId, organizationId);
        return runRepository.findBySchemaVersionIdAndOrganizationId(schemaVersionId, organizationId);
    }

    @Override
    public PredictionRun getRun(Long userId, Long runId) {
        Long organizationId = requireRead(userId);
        return runRepository.findByIdAndOrganizationId(runId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found"));
    }

    @Override
    public Long getLastPredictionRunId(Long userId) {
        requireOperate(userId);
        return runRepository.findLastPredictionRunId();
    }

    private Long requireRead(Long userId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, organizationId);
        return organizationId;
    }

    private Long requireOperate(Long userId) {
        userLookupService.requireById(userId);
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationOperate(userId, organizationId);
        return organizationId;
    }

    private SchemaVersion requireVersion(Long schemaVersionId, Long organizationId) {
        return versionRepository.findByIdAndOrganizationId(schemaVersionId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema version not found"));
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
