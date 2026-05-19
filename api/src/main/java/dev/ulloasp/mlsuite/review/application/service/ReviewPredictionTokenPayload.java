package dev.ulloasp.mlsuite.review.application.service;

import java.time.OffsetDateTime;

public record ReviewPredictionTokenPayload(
        int v,
        Long linkId,
        Long predictionId,
        OffsetDateTime exp) {
}
