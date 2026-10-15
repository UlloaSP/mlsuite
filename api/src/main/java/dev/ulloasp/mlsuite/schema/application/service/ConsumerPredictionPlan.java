package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;

/**
 * An accepted API key run: the key and its name at call time, the bookmark and snapshot by id
 * so the run is recorded against them after the runtime answers, the one model it runs, the
 * reports of the bookmark's form that model fills, and the record as the consumer sent it.
 */
public record ConsumerPredictionPlan(Long keyId, String keyName, Long bookmarkId, Long versionId, Long modelId,
        List<PublicForm.ReportRoute> reports, Map<String, Object> features) {
}
