package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;

/** A validated public run: what each model receives and which reports its answers fill. */
public record PublicPredictionPlan(String publicId, List<ModelCall> calls, List<PublicForm.ReportRoute> reports) {

    public record ModelCall(Long modelId, Map<String, Object> input) {
    }
}
