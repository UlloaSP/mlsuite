package dev.ulloasp.mlsuite.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.prediction.application.dto.PredictionDto;

public record ReviewPredictionListItemDto(
        String selectionToken,
        PredictionDto prediction,
        ReviewPredictionState reviewState,
        OffsetDateTime stateEnteredAt,
        OffsetDateTime submittedAt) {
}
