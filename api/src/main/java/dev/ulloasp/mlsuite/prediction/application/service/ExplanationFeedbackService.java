/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.application.port.in.ExplanationFeedbackCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;

public interface ExplanationFeedbackService extends ExplanationFeedbackCatalogUseCase {

    ExplanationFeedback createExplanationFeedback(Long userId, Long predictionId, int order, JsonNode value);

    ExplanationFeedback updateExplanationFeedback(Long userId, Long explanationFeedbackId, JsonNode realValue);

    List<ExplanationFeedback> getExplanationFeedbackByPredictionId(Long userId, Long predictionId);
}

