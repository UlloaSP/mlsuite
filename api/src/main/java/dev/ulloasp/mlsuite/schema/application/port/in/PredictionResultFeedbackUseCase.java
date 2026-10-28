package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackRevisionDto;

public interface PredictionResultFeedbackUseCase {
    List<PredictionResultFeedback> listByResult(Long userId, Long resultId);

    List<PredictionResultFeedback> listByRuns(Long userId, List<Long> runIds);

    /** Every change of every answer about the result, oldest first, including answers since removed. */
    List<PredictionResultFeedbackRevisionDto> historyOfResult(Long userId, Long resultId);
}
