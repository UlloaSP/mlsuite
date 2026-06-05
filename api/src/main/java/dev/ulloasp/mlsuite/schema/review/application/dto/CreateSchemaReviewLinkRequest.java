package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateSchemaReviewLinkRequest(
        @NotNull Long schemaId,
        @NotNull Long versionId,
        @NotEmpty List<Long> runIds,
        OffsetDateTime expiresAt) {
}
