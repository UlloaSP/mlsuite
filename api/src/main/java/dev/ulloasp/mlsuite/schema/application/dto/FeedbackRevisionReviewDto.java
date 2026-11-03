package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;

/** The review an answer was given in, as people tell reviews apart: who opened it, and when. */
public record FeedbackRevisionReviewDto(String publicId, OffsetDateTime createdAt, String createdByName) {

    public static FeedbackRevisionReviewDto from(SchemaReview review) {
        return new FeedbackRevisionReviewDto(review.getPublicId(), review.getCreatedAt(),
                DeletedUser.nameOf(review.getCreatedBy()));
    }
}
