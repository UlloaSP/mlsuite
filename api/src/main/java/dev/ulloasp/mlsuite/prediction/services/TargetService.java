/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.Target;

public interface TargetService {

    Target createTarget(Long userId, Long predictionId, int order, JsonNode value);

    Target updateTarget(Long userId, Long targetId, JsonNode realValue);

    List<Target> getTargetsByPredictionId(Long userId, Long predictionId);

}
