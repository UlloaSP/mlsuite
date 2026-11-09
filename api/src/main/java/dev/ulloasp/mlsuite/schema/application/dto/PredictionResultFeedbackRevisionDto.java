package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.Map;

import tools.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import jakarta.annotation.Nullable;

/**
 * One change of an answer about a result: the answer it changed, the review it belongs to (none
 * for a public page's), its author (a member or a visitor), what it said after the change (nothing
 * once deleted), and who changed it, when. Authors outlive their accounts as principals, so a
 * member who no longer exists is named as their principal was left ("Deleted user"); a review
 * that no longer exists is null.
 */
public record PredictionResultFeedbackRevisionDto(
        Long id,
        Long feedbackId,
        Long resultId,
        @Nullable Long reviewId,
        @Nullable FeedbackRevisionReviewDto review,
        @Nullable Long authorUserId,
        @Nullable String authorName,
        boolean byVisitor,
        PredictionResultFeedbackType type,
        int order,
        @Nullable JsonNode value,
        PredictionResultFeedbackChange change,
        @Nullable Long changedByUserId,
        @Nullable String changedByName,
        OffsetDateTime changedAt) {

    public static PredictionResultFeedbackRevisionDto from(PredictionResultFeedbackRevision revision,
            Map<Long, Principal> principals, Map<Long, SchemaReview> reviews) {
        SchemaReview review = revision.getReviewId() == null ? null : reviews.get(revision.getReviewId());
        Principal author = principals.get(revision.getAuthorId());
        Principal changedBy = principals.get(revision.getChangedById());
        return new PredictionResultFeedbackRevisionDto(revision.getId(), revision.getFeedbackId(),
                revision.getResultId(), revision.getReviewId(),
                review == null ? null : FeedbackRevisionReviewDto.from(review),
                author.userId(), author.label(), author.isVisitor(),
                revision.getType(), revision.getOrder(), revision.getValue(), revision.getChange(),
                changedBy.userId(), changedBy.label(), revision.getChangedAt());
    }
}
