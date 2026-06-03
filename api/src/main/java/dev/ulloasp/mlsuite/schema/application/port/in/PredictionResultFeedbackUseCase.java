package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.application.dto.UpdatePredictionResultFeedbackRequest;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;

public interface PredictionResultFeedbackUseCase {
    PredictionResultFeedback create(Long userId, CreatePredictionResultFeedbackRequest request);

    PredictionResultFeedback update(Long userId, UpdatePredictionResultFeedbackRequest request);

    List<PredictionResultFeedback> listByResult(Long userId, Long resultId);
}
