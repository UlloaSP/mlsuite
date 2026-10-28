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
 * Runs one bound model of a bookmark's snapshot for a member and seals what came back, or runs
 * many records of it for a bulk job (PredictionJobWorker). The member chooses the values; the server
 * performs the run and shapes its answer as every run stores it (PublicRunReports), so a saved
 * run holds only results the server produced. As on public pages, a plugin report is the
 * runtime's explanation of the prediction, asked for in the same run. A record the runtime
 * refuses, or a runtime that fails, gives a failed result, sealed the same way; among many records
 * each succeeds or fails on its own.
 *
 * <p>This class is deliberately not transactional, and its endpoints are left out of open-in-view
 * (see OpenInViewConfig): the run first takes its member's place in the workspace share's queue,
 * so a run that cannot be served is turned away before any database work; then the plan is read
 * and returned, and the run waits for a slot and calls the runtime with no connection held. A
 * batch takes one place and one slot, like a single record.
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
        try (RuntimeSlots.Admission admission = slots.admit(userId)) {
            Plan plan = planner.plan(userId, bookmarkId, request.schemaVersionId(), request.modelId());
            // The explanation shares the prediction's slot.
            return sealed(admission.run(() -> perform(plan, request.modelInput())));
        }
    }

    private WorkspacePredictionDto sealed(AttestedPrediction prediction) {
        return new WorkspacePredictionDto(prediction.modelId(), prediction.modelInput(), prediction.output(),
                prediction.status(), prediction.errorMessage(), prediction.errorJson(), attestations.seal(prediction));
    }

    private AttestedPrediction perform(Plan plan, Map<String, Object> input) {
        try {
            return succeeded(plan, input, runtime.run("/predict", plan.model(), Map.of("data", json(input))));
        } catch (AnalyzerServiceException refused) {
            return failed(plan, input, refused.getStatus(), refused.getDetail());
        }
    }

    /**
     * Runs many records of one model in one runtime call (a bulk job's chunk), with no slot taken:
     * the caller holds one. The runtime answers each record in order: its reports, or the error it
     * alone got.
     */
    public List<AttestedPrediction> predictRows(Plan plan, List<Map<String, Object>> inputs) {
        List<?> answers;
        try {
            Object rows = runtime.run("/predict/batch", plan.model(), Map.of("data", json(inputs))).get("rows");
            answers = rows instanceof List<?> items ? items : List.of();
        } catch (AnalyzerServiceException refused) {
            return inputs.stream().map(input -> failed(plan, input, refused.getStatus(), refused.getDetail())).toList();
        }
        if (answers.size() != inputs.size()) {
            log.error("Model {}: the runtime answered {} records of {}", plan.modelId(), answers.size(), inputs.size());
            return inputs.stream().map(input -> failed(plan, input, 0, null)).toList();
        }
        List<AttestedPrediction> predictions = new ArrayList<>(inputs.size());
        for (int index = 0; index < inputs.size(); index++) {
            Map<String, Object> input = inputs.get(index);
            Map<?, ?> answer = answers.get(index) instanceof Map<?, ?> row ? row : Map.of();
            if (answer.get("error") instanceof Map<?, ?> error) {
                int status = error.get("status") instanceof Number number ? number.intValue() : 0;
                String detail = error.get("detail") instanceof String text ? text : null;
                predictions.add(failed(plan, input, status, detail));
            } else {
                Map<String, Object> reports = new LinkedHashMap<>();
                answer.forEach((key, value) -> reports.put(String.valueOf(key), value));
                predictions.add(succeeded(plan, input, reports));
            }
        }
        return predictions;
    }

    private AttestedPrediction succeeded(Plan plan, Map<String, Object> input, Map<String, Object> runtimeAnswer) {
        Map<String, Object> answer = new LinkedHashMap<>(runtimeAnswer);
        if (plan.explained()) {
            answer.put("reports", withExplanation(answer.get("reports"), explain(plan, json(input))));
        }
        return new AttestedPrediction(plan.organizationId(), plan.schemaVersionId(), plan.modelId(), input,
                PublicRunReports.storedOutput(plan.modelId(), input, answer, plan.routes()),
                PredictionResultStatus.SUCCESS, null, null, attestations.now());
    }

    /** A failed result keeps no reports, only the record the model was given. */
    private AttestedPrediction failed(Plan plan, Map<String, Object> input, int runtimeStatus, String detail) {
        String message = detail == null || detail.isBlank() ? "Analyzer Error" : detail;
        int status = runtimeStatus > 0 ? runtimeStatus : HttpStatus.BAD_GATEWAY.value();
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("modelId", String.valueOf(plan.modelId()));
        meta.put("backendFieldValues", input);
        return new AttestedPrediction(plan.organizationId(), plan.schemaVersionId(), plan.modelId(), input,
                Map.of("meta", meta), PredictionResultStatus.FAILED, message,
                Map.of("status", status, "message", message), attestations.now());
    }

    /** A model the runtime cannot explain gives no explanation, and the prediction stands. */
    private List<?> explain(Plan plan, String data) {
        try {
            Object reports = runtime.run("/explain", plan.model(), Map.of("data", data, "traces", "[]"))
                    .get("reports");
            return reports instanceof List<?> items ? items : List.of();
        } catch (RuntimeException ex) {
            log.warn("Model {} could not be explained: {}", plan.modelId(), ex.getMessage());
            return List.of();
        }
    }

    private String json(Object input) {
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
}
