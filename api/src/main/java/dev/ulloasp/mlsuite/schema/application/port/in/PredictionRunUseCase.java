package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionRunRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;

public interface PredictionRunUseCase {
    PredictionRun createRunForBookmark(Long userId, Long schemaBookmarkId, CreatePredictionRunRequest request);

    /** Saves the runs in order in one transaction: all of them, or none when one is refused. */
    List<Long> createRunsForBookmark(Long userId, Long schemaBookmarkId, List<CreatePredictionRunRequest> requests);

    PredictionRun getRun(Long userId, Long runId);

    /** Removes the run, from any review it is in, with its results and answers. */
    void deleteRun(Long userId, Long runId);

    /** The same for several runs of the organization, all of them or none; returns how many went. */
    int deleteRuns(Long userId, List<Long> runIds);
}
