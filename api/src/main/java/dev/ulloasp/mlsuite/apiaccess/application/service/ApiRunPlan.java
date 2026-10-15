package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiCaller;
import dev.ulloasp.mlsuite.schema.application.service.PublicForm.ReportRoute;

/**
 * Everything a call runs, read before the runtime is called: the bookmark, the snapshot it
 * pointed at, its one model and the reports the run keeps, and the record as the client sent it.
 */
record ApiRunPlan(
        ApiCaller caller,
        ApiTarget target,
        Long versionId,
        int version,
        String versionName,
        Long modelId,
        String modelName,
        String modelSha256,
        List<ReportRoute> reports,
        Map<String, Object> features) {
}
