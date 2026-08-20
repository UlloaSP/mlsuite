package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

public record SchemaReviewAssignmentStatusDto(
        String reviewId,
        String reviewRunId,
        SchemaReviewReviewerDto reviewer,
        SchemaReviewReviewerDto createdBy,
        String reviewState,
        OffsetDateTime submittedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime expiresAt,
        boolean expired) {
}
