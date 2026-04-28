/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.application.port.in.OutputFeedbackCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;

public interface OutputFeedbackService extends OutputFeedbackCatalogUseCase {

    OutputFeedback createOutputFeedback(Long userId, Long predictionId, int order, JsonNode value);

    OutputFeedback updateOutputFeedback(Long userId, Long outputFeedbackId, JsonNode value);

    List<OutputFeedback> getOutputFeedbackByPredictionId(Long userId, Long predictionId);
}

