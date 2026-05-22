package dev.ulloasp.mlsuite.review.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateReviewLinkRequest(
        @NotNull @Positive Long modelId,
        @NotNull @Positive Long signatureId,
        @NotEmpty List<@Positive Long> predictionIds,
        OffsetDateTime expiresAt) {
}
