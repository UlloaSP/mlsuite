/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.services;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.entities.Target;

public interface TargetService {

    Target createTarget(Long userId, Long organizationId, Long predictionId, int order, JsonNode value);

    default Target createTarget(Long userId, Long predictionId, int order, JsonNode value) {
        return createTarget(userId, userId, predictionId, order, value);
    }

    Target updateTarget(Long userId, Long organizationId, Long targetId, JsonNode realValue);

    default Target updateTarget(Long userId, Long targetId, JsonNode realValue) {
        return updateTarget(userId, userId, targetId, realValue);
    }

    List<Target> getTargetsByPredictionId(Long userId, Long organizationId, Long predictionId);

    default List<Target> getTargetsByPredictionId(Long userId, Long predictionId) {
        return getTargetsByPredictionId(userId, userId, predictionId);
    }

}
