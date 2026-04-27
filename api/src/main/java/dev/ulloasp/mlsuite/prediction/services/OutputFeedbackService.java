/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;

public interface OutputFeedbackService {

    OutputFeedback createOutputFeedback(Long userId, Long predictionId, int order, JsonNode value);

    OutputFeedback updateOutputFeedback(Long userId, Long outputFeedbackId, JsonNode value);

    List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long predictionId);
}
