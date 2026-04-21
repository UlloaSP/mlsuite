/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;

public interface PredictionService {

        public Prediction createPrediction(Long userId, Long signatureId, String name,
                        Map<String, Object> prediction, Map<String, Object> data);

        public Prediction updatePrediction(Long userId, Long predictionId,
                        PredictionStatus status);

        public Prediction getPrediction(Long userId, Long predictionId);

        public List<Prediction> getPredictionsBySignatureId(Long userId, Long signatureId);
}
