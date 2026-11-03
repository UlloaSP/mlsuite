package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository.ManagedReview;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;
import jakarta.annotation.Nullable;

/** A review of the organization: {@code runs} is zero once every inference it held was deleted. */
public record ManagedReviewDto(
        String id,
        String schemaName,
        int schemaVersion,
        @Nullable String schemaVersionName,
        String createdByName,
        long runs,
        long reviewers,
        OffsetDateTime createdAt,
        OffsetDateTime expiresAt) {

    public static ManagedReviewDto from(ManagedReview row) {
        SchemaReview review = row.getReview();
        return new ManagedReviewDto(review.getPublicId(), review.getSchema().getName(),
                review.getSchemaVersion().getVersion(), review.getSchemaVersion().getName(),
                DeletedUser.nameOf(review.getCreatedBy()), row.getRuns(), row.getReviewers(),
                review.getCreatedAt(), review.getExpiresAt());
    }
}
