/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;

public interface ExplanationFeedbackService {

    ExplanationFeedback createExplanationFeedback(Long userId, Long organizationId, Long predictionId, int order, JsonNode value);

    default ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        return createExplanationFeedback(userId, userId, predictionId, order, value);
    }

    ExplanationFeedback updateExplanationFeedback(Long userId, Long organizationId, Long explanationFeedbackId, JsonNode realValue);

    default ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue) {
        return updateExplanationFeedback(userId, userId, explanationFeedbackId, realValue);
    }

    List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long organizationId, Long predictionId);

    default List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId) {
        return getExplanationFeedbackByPredictionId(userId, userId, predictionId);
    }
}
