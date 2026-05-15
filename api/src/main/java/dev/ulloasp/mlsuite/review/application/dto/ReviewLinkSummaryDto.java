package dev.ulloasp.mlsuite.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.review.domain.model.ReviewLink;

public record ReviewLinkSummaryDto(
        Long id,
        Long modelId,
        Long signatureId,
        String createdByEmail,
        OffsetDateTime expiresAt,
        OffsetDateTime revokedAt,
        OffsetDateTime createdAt,
        String token,
        int predictionCount) {

    public static ReviewLinkSummaryDto from(ReviewLink link, int predictionCount) {
        return new ReviewLinkSummaryDto(
                link.getId(),
                link.getModel().getId(),
                link.getSignature().getId(),
                link.getCreatedBy().getEmail(),
                link.getExpiresAt(),
                link.getRevokedAt(),
                link.getCreatedAt(),
                link.getToken(),
                predictionCount);
    }
}
