/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface PredictionService {

        public Prediction createPrediction(OAuthProvider oauthProvider, String oauthId, Long signatureId, String name,
                        Map<String, Object> prediction, Map<String, Object> data);

        public Prediction updatePrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId,
                        PredictionStatus status);

        public Prediction getPrediction(OAuthProvider oauthProvider, String oauthId, Long predictionId);

        public List<Prediction> getPredictionsBySignatureId(OAuthProvider oauthProvider, String oauthId,
                        Long signatureId);
}
