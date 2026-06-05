package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;

public record SchemaReviewRunListItemDto(
        String selectionToken,
        PredictionRunDto run,
        String reviewState,
        OffsetDateTime stateEnteredAt,
        OffsetDateTime submittedAt) {
}
