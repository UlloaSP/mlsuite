package dev.ulloasp.mlsuite.schema.review.application.service;

import java.time.OffsetDateTime;

public record SchemaReviewLinkTokenPayload(
        int v,
        Long linkId,
        Long orgId,
        Long schemaId,
        Long versionId,
        OffsetDateTime exp,
        String nonce) {
}
