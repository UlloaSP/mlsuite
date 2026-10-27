package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;

public interface PredictionResultFeedbackUseCase {
    List<PredictionResultFeedback> listByResult(Long userId, Long resultId);

    List<PredictionResultFeedback> listByRuns(Long userId, List<Long> runIds);
}
