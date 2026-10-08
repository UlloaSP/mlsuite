package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;

/**
 * A validated public run: what each model receives, which reports its answers fill, and what
 * the run keeps once made ({@code storedInputs}: the values under their fields' display keys,
 * as a workspace run stores them). The bookmark and snapshot are named by id so the run can be
 * recorded against them after the runtime answers, in a transaction of its own.
 */
public record PublicPredictionPlan(String publicId, Long bookmarkId, Long versionId, List<ModelCall> calls,
        List<PublicForm.ReportRoute> reports, Map<String, Object> storedInputs) {

    public record ModelCall(Long modelId, Map<String, Object> input) {
    }
}
