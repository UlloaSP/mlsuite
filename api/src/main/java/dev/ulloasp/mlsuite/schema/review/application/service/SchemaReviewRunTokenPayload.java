package dev.ulloasp.mlsuite.schema.review.application.service;

import java.time.OffsetDateTime;

public record SchemaReviewRunTokenPayload(
        int v,
        Long linkId,
        Long runId,
        OffsetDateTime exp) {
}
