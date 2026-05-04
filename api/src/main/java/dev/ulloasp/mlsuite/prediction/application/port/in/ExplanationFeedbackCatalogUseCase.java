package dev.ulloasp.mlsuite.prediction.application.port.in;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;

public interface ExplanationFeedbackCatalogUseCase {

    ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value);

    ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue);

    List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId);
}
