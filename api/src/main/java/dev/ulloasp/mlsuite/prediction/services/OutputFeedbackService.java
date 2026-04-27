/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;

public interface OutputFeedbackService {

    OutputFeedback createOutputFeedback(Long userId, Long organizationId, Long predictionId, int order, JsonNode value);

    default OutputFeedback createOutputFeedback(Long userId, Long predictionId, int order, JsonNode value) {
        return createOutputFeedback(userId, userId, predictionId, order, value);
    }

    OutputFeedback updateOutputFeedback(Long userId, Long organizationId, Long outputFeedbackId, JsonNode value);

    default OutputFeedback updateOutputFeedback(Long userId, Long outputFeedbackId, JsonNode value) {
        return updateOutputFeedback(userId, userId, outputFeedbackId, value);
    }

    List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long organizationId, Long predictionId);

    default List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long predictionId) {
        return getOutputFeedbackByPredictionId(userId, userId, predictionId);
    }
}
