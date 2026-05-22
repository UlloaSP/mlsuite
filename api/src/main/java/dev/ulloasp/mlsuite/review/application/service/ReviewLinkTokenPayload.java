package dev.ulloasp.mlsuite.review.application.service;

import java.time.OffsetDateTime;

public record ReviewLinkTokenPayload(
        int v,
        Long linkId,
        Long orgId,
        Long modelId,
        Long signatureId,
        OffsetDateTime exp,
        String nonce) {
}
