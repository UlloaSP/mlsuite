/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;

public interface ExplanationFeedbackService {

    ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value);

    ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue);

    List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId);
}
