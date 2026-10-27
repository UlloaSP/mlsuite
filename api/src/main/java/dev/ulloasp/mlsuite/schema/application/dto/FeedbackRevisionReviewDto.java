package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import jakarta.annotation.Nullable;

/** The review an answer was given in, as people tell reviews apart: who opened it, and when. */
public record FeedbackRevisionReviewDto(String publicId, OffsetDateTime createdAt, @Nullable String createdByName) {

    public static FeedbackRevisionReviewDto from(SchemaReview review) {
        return new FeedbackRevisionReviewDto(review.getPublicId(), review.getCreatedAt(),
                review.getCreatedBy() == null ? null : review.getCreatedBy().getFullName());
    }
}
