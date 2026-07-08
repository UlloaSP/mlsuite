package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;

public interface PredictionRunUseCase {
    PredictionRun createRunForBookmark(Long userId, Long schemaBookmarkId, CreatePredictionRunRequest request);

    List<PredictionRun> listRunsForBookmark(Long userId, Long schemaBookmarkId);

    PredictionRun getRun(Long userId, Long runId);

    Long getLastPredictionRunId(Long userId);
}
