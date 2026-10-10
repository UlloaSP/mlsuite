package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState;

import jakarta.annotation.Nullable;

public record ReviewInboxItemDto(
        String publicId,
        PredictionRunDto run,
        SchemaReviewState reviewState,
        OffsetDateTime stateEnteredAt,
        @Nullable OffsetDateTime submittedAt,
        String reviewId,
        String schemaName) {
}
