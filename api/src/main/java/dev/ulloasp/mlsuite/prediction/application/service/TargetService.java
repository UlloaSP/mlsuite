/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.application.service;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.application.port.in.TargetCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.Target;

public interface TargetService extends TargetCatalogUseCase {

    Target createTarget(Long userId, Long predictionId, int order, JsonNode value);

    Target updateTarget(Long userId, Long targetId, JsonNode realValue);

    List<Target> getTargetsByPredictionId(Long userId, Long predictionId);

}

