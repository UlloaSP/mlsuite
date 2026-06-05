package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;

public interface PredictionRunUseCase {
    PredictionRun createRun(Long userId, Long schemaVersionId, CreatePredictionRunRequest request);

    List<PredictionRun> listRuns(Long userId, Long schemaVersionId);

    PredictionRun getRun(Long userId, Long runId);

    Long getLastPredictionRunId(Long userId);
}
