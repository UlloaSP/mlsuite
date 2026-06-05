package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReviewLink;

public record SchemaReviewLinkSummaryDto(
        Long id,
        Long schemaId,
        Long versionId,
        String createdByEmail,
        OffsetDateTime expiresAt,
        OffsetDateTime revokedAt,
        OffsetDateTime createdAt,
        String token,
        int runCount) {
    public static SchemaReviewLinkSummaryDto from(SchemaReviewLink link, int runCount) {
        return new SchemaReviewLinkSummaryDto(
                link.getId(),
                link.getSchema().getId(),
                link.getSchemaVersion().getId(),
                link.getCreatedBy().getEmail(),
                link.getExpiresAt(),
                link.getRevokedAt(),
                link.getCreatedAt(),
                link.getToken(),
                runCount);
    }
}
