package dev.ulloasp.mlsuite.prediction.application.port.in;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;

public interface OutputFeedbackCatalogUseCase {

    OutputFeedback createOutputFeedback(Long userId, Long predictionId, int order, JsonNode value);

    OutputFeedback updateOutputFeedback(Long userId, Long outputFeedbackId, JsonNode value);

    List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long predictionId);
}
