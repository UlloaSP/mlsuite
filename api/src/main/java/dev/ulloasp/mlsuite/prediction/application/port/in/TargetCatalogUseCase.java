package dev.ulloasp.mlsuite.prediction.application.port.in;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.prediction.domain.model.Target;

public interface TargetCatalogUseCase {

    Target createTarget(Long userId, Long predictionId, int order, JsonNode value);

    Target updateTarget(Long userId, Long targetId, JsonNode realValue);

    List<Target> getTargetsByPredictionId(Long userId, Long predictionId);
}
