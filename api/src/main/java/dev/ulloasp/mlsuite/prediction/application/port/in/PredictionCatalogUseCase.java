package dev.ulloasp.mlsuite.prediction.application.port.in;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;

public interface PredictionCatalogUseCase {

    Prediction createPrediction(
            Long userId,
            Long signatureId,
            String name,
            boolean overwrite,
            Map<String, Object> prediction,
            Map<String, Object> data);

    Prediction updatePrediction(Long userId, Long predictionId, PredictionStatus status);

    Prediction getPrediction(Long userId, Long predictionId);

    List<Prediction> getPredictionsBySignatureId(Long userId, Long signatureId);
}
