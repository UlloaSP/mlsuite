package dev.ulloasp.mlsuite.review.application.dto;

import java.time.OffsetDateTime;

public record ReviewLinkCreateResponse(
        Long id,
        String url,
        OffsetDateTime expiresAt,
        int predictionCount) {
}
