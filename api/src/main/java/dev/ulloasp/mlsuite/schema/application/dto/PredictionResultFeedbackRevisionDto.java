package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackChange;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackRevision;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import jakarta.annotation.Nullable;

/**
 * One change of an answer about a result: the answer it changed, the review it belongs to (none
 * for a public page's), its author (a member or a visitor), what it said after the change (nothing
 * once deleted), and the member who changed it, when.
 */
public record PredictionResultFeedbackRevisionDto(
        Long id,
        Long feedbackId,
        Long resultId,
        @Nullable Long reviewId,
        @Nullable Long userId,
        @Nullable UUID visitorId,
        PredictionResultFeedbackType type,
        int order,
        @Nullable JsonNode value,
        PredictionResultFeedbackChange change,
        @Nullable Long changedByUserId,
        OffsetDateTime changedAt) {

    public static PredictionResultFeedbackRevisionDto from(PredictionResultFeedbackRevision revision) {
        return new PredictionResultFeedbackRevisionDto(revision.getId(), revision.getFeedbackId(),
                revision.getResultId(), revision.getReviewId(), revision.getUserId(), revision.getVisitorId(),
                revision.getType(), revision.getOrder(), revision.getValue(), revision.getChange(),
                revision.getChangedByUserId(), revision.getChangedAt());
    }
}
