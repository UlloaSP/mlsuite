package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewState;

import jakarta.annotation.Nullable;

public record SchemaReviewAssignmentStatusDto(
        String reviewId,
        String reviewRunId,
        SchemaReviewReviewerDto reviewer,
        SchemaReviewReviewerDto createdBy,
        SchemaReviewState reviewState,
        @Nullable OffsetDateTime submittedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime expiresAt,
        boolean expired) {
}
