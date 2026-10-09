package dev.ulloasp.mlsuite.schema.catalog;

import java.util.Map;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;

public record InferenceCatalogRowDto(
        PredictionRunCatalogItemDto item,
        InferenceFeedbackStatus feedbackStatus,
        Map<String, Object> values,
        Map<String, String> displayValues) {
}
