/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.prediction.application.port.in.PredictionCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;

public interface PredictionService extends PredictionCatalogUseCase {

        public Prediction createPrediction(Long userId, Long signatureId, String name,
                        boolean overwrite, Map<String, Object> prediction, Map<String, Object> data);

        public Prediction updatePrediction(Long userId, Long predictionId,
                        PredictionStatus status);

        public Prediction getPrediction(Long userId, Long predictionId);

        public List<Prediction> getPredictionsBySignatureId(Long userId, Long signatureId);
}

