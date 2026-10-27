package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;

public interface PredictionRunUseCase {
    PredictionRun createRunForBookmark(Long userId, Long schemaBookmarkId, CreatePredictionRunRequest request);

    PredictionRun getRun(Long userId, Long runId);

    void deleteRun(Long userId, Long runId);
}
