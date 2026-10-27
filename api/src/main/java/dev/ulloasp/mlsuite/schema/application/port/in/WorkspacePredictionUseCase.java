package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionBatchDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionBatchRequest;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.WorkspacePredictionRequest;

public interface WorkspacePredictionUseCase {
    WorkspacePredictionDto predict(Long userId, Long bookmarkId, WorkspacePredictionRequest request);

    WorkspacePredictionBatchDto predictBatch(Long userId, Long bookmarkId, WorkspacePredictionBatchRequest request);
}
