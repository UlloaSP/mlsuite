package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.WorkspacePredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.PublicForm.ReportRoute;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * Runs one bound model of a bookmark's snapshot for a member and seals what came back. The member
 * chooses the values; the server performs the run and shapes its answer as every run stores it
 * (PublicRunReports), so a saved run holds only results the server produced. As on public pages,
 * a plugin report is the runtime's explanation of the prediction, asked for in the same run. A
 * record the runtime refuses, or a runtime that fails, gives a failed result, sealed the same way.
 */
@Service
@RequiredArgsConstructor
public class WorkspacePredictionService implements WorkspacePredictionUseCase {

    private static final Logger log = LoggerFactory.getLogger(WorkspacePredictionService.class);

    private final WorkspaceAuthorizationService authorizationService;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final BookmarkPublishability publishability;
    private final AnalyzerUseCase analyzer;
    private final PredictionAttestations attestations;

    @Override
    public WorkspacePredictionDto predict(Long userId, Long bookmarkId, WorkspacePredictionRequest request) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
        SchemaBookmark bookmark = bookmarkRepository.findByIdAndOrganizationId(bookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        SchemaVersion version = bookmark.getVersion();
        if (!version.getId().equals(request.schemaVersionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The bookmark moved to another snapshot; reload before running");
        }
        List<BoundModel> models = publishability.models(version);
        if (models.stream().noneMatch(model -> model.id().equals(request.modelId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The model is not bound to this snapshot");
        }
        List<ReportRoute> routes = PublicForm.of(version.getFormSchema(), models).reportRoutes();
        AttestedPrediction prediction = perform(userId, organizationId, version.getId(), request, routes);
        return new WorkspacePredictionDto(prediction.modelId(), prediction.modelInput(), prediction.output(),
                prediction.status(), prediction.errorMessage(), prediction.errorJson(), attestations.seal(prediction));
    }

    private AttestedPrediction perform(Long userId, Long organizationId, Long versionId,
            WorkspacePredictionRequest request, List<ReportRoute> routes) {
        Long modelId = request.modelId();
        Map<String, Object> input = request.modelInput();
        Map<String, Object> answer;
        try {
            answer = new LinkedHashMap<>(analyzer.predict(userId, modelId, input));
        } catch (AnalyzerServiceException refused) {
            String message = refused.getDetail() == null || refused.getDetail().isBlank()
                    ? "Analyzer Error" : refused.getDetail();
            int status = refused.getStatus() > 0 ? refused.getStatus() : HttpStatus.BAD_GATEWAY.value();
            return new AttestedPrediction(organizationId, versionId, modelId, input, failedOutput(modelId, input),
                    PredictionResultStatus.FAILED, message, Map.of("status", status, "message", message),
                    attestations.now());
        }
        if (routes.stream().anyMatch(route -> route.modelId().equals(modelId) && !route.assessed())) {
            answer.put("reports", withExplanation(answer.get("reports"), explain(userId, modelId, input)));
        }
        return new AttestedPrediction(organizationId, versionId, modelId, input,
                PublicRunReports.storedOutput(modelId, input, answer, routes), PredictionResultStatus.SUCCESS,
                null, null, attestations.now());
    }

    /** A model the runtime cannot explain gives no explanation, and the prediction stands. */
    private List<?> explain(Long userId, Long modelId, Map<String, Object> input) {
        try {
            Object reports = analyzer.explain(userId, modelId, new ExplainRequest(input, List.of())).get("reports");
            return reports instanceof List<?> items ? items : List.of();
        } catch (RuntimeException ex) {
            log.warn("Model {} could not be explained: {}", modelId, ex.getMessage());
            return List.of();
        }
    }

    private static List<Object> withExplanation(Object predicted, List<?> explained) {
        List<Object> reports = new ArrayList<>(predicted instanceof List<?> items ? items : List.of());
        reports.addAll(explained);
        return reports;
    }

    /** A failed result keeps no reports, only the record the model was given. */
    private static Map<String, Object> failedOutput(Long modelId, Map<String, Object> input) {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("modelId", String.valueOf(modelId));
        meta.put("backendFieldValues", input);
        return Map.of("meta", meta);
    }
}
