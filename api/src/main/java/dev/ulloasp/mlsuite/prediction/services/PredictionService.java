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

        public Prediction createPrediction(Long userId, Long organizationId, Long signatureId, String name,
                        boolean overwrite, Map<String, Object> prediction, Map<String, Object> data);

        default Prediction createPrediction(Long userId, Long signatureId, String name,
                        boolean overwrite, Map<String, Object> prediction, Map<String, Object> data) {
                return createPrediction(userId, userId, signatureId, name, overwrite, prediction, data);
        }

        public Prediction updatePrediction(Long userId, Long organizationId, Long predictionId,
                        PredictionStatus status);

        default Prediction updatePrediction(Long userId, Long predictionId,
                        PredictionStatus status) {
                return updatePrediction(userId, userId, predictionId, status);
        }

        public Prediction getPrediction(Long userId, Long organizationId, Long predictionId);

        default Prediction getPrediction(Long userId, Long predictionId) {
                return getPrediction(userId, userId, predictionId);
        }

        public List<Prediction> getPredictionsBySignatureId(Long userId, Long organizationId, Long signatureId);

        default List<Prediction> getPredictionsBySignatureId(Long userId, Long signatureId) {
                return getPredictionsBySignatureId(userId, userId, signatureId);
        }
}
