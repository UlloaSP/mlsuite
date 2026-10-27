package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.application.service.WorkspaceRuntimeSlots;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.WorkspacePredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.WorkspacePredictionPlanner.Plan;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import lombok.RequiredArgsConstructor;

/**
 * Runs one bound model of a bookmark's snapshot for a member and seals what came back. The member
 * chooses the values; the server performs the run and shapes its answer as every run stores it
 * (PublicRunReports), so a saved run holds only results the server produced. As on public pages,
 * a plugin report is the runtime's explanation of the prediction, asked for in the same run. A
 * record the runtime refuses, or a runtime that fails, gives a failed result, sealed the same way.
 *
 * <p>This class is deliberately not transactional, and its endpoint is left out of open-in-view
 * (see OpenInViewConfig): the run first takes its member's place in the workspace share's queue,
 * so a run that cannot be served is turned away before any database work; then the plan is read
 * and returned, and the run waits for a slot and calls the runtime with no connection held.
 */
@Service
@RequiredArgsConstructor
public class WorkspacePredictionService implements WorkspacePredictionUseCase {

    private static final Logger log = LoggerFactory.getLogger(WorkspacePredictionService.class);

    private final WorkspacePredictionPlanner planner;
    private final WorkspaceRuntimeSlots slots;
    private final ModelRuntimeClient runtime;
    private final PredictionAttestations attestations;
    private final ObjectMapper objectMapper;

    @Override
    public WorkspacePredictionDto predict(Long userId, Long bookmarkId, WorkspacePredictionRequest request) {
        AttestedPrediction prediction;
        try (RuntimeSlots.Admission admission = slots.admit(userId)) {
            Plan plan = planner.plan(userId, bookmarkId, request);
            // The explanation shares the prediction's slot.
            prediction = admission.run(() -> perform(plan, request.modelInput()));
        }
        return new WorkspacePredictionDto(prediction.modelId(), prediction.modelInput(), prediction.output(),
                prediction.status(), prediction.errorMessage(), prediction.errorJson(), attestations.seal(prediction));
    }

    private AttestedPrediction perform(Plan plan, Map<String, Object> input) {
        Long modelId = plan.modelId();
        String data = json(input);
        Map<String, Object> answer;
        try {
            answer = new LinkedHashMap<>(runtime.run("/predict", plan.artifact(), Map.of("data", data)));
        } catch (AnalyzerServiceException refused) {
            String message = refused.getDetail() == null || refused.getDetail().isBlank()
                    ? "Analyzer Error" : refused.getDetail();
            int status = refused.getStatus() > 0 ? refused.getStatus() : HttpStatus.BAD_GATEWAY.value();
            return new AttestedPrediction(plan.organizationId(), plan.schemaVersionId(), modelId, input,
                    failedOutput(modelId, input), PredictionResultStatus.FAILED, message,
                    Map.of("status", status, "message", message), attestations.now());
        }
        if (plan.explained()) {
            answer.put("reports", withExplanation(answer.get("reports"), explain(plan, data)));
        }
        return new AttestedPrediction(plan.organizationId(), plan.schemaVersionId(), modelId, input,
                PublicRunReports.storedOutput(modelId, input, answer, plan.routes()), PredictionResultStatus.SUCCESS,
                null, null, attestations.now());
    }

    /** A model the runtime cannot explain gives no explanation, and the prediction stands. */
    private List<?> explain(Plan plan, String data) {
        try {
            Object reports = runtime.run("/explain", plan.artifact(), Map.of("data", data, "traces", "[]"))
                    .get("reports");
            return reports instanceof List<?> items ? items : List.of();
        } catch (RuntimeException ex) {
            log.warn("Model {} could not be explained: {}", plan.modelId(), ex.getMessage());
            return List.of();
        }
    }

    private String json(Map<String, Object> input) {
        try {
            return objectMapper.writeValueAsString(input);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("The model input is not serializable as JSON", ex);
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
