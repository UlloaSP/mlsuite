package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

public record SchemaReviewLinkCreateResponse(
        Long id,
        String url,
        OffsetDateTime expiresAt,
        int runCount) {
}
