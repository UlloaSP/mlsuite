package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * One change of an answer, as it stood after the change: who gave the answer, in which review,
 * what it said (nothing once deleted) and who changed it when. Revisions are only ever added, and
 * outlive the answer they describe, so every label a model was given stays auditable.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "prediction_result_feedback_revision")
public class PredictionResultFeedbackRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feedback_id", nullable = false, updatable = false)
    private Long feedbackId;

    @Column(name = "prediction_result_id", nullable = false, updatable = false)
    private Long resultId;

    @Column(name = "schema_review_id", updatable = false)
    private Long reviewId;

    @Column(name = "user_id", updatable = false)
    private Long userId;

    @Column(name = "visitor_id", updatable = false)
    private UUID visitorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback_type", nullable = false, updatable = false, length = 32)
    private PredictionResultFeedbackType type;

    @Column(name = "orden", nullable = false, updatable = false)
    private int order;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_value", updatable = false)
    private JsonNode value;

    @Enumerated(EnumType.STRING)
    @Column(name = "change", nullable = false, updatable = false, length = 16)
    private PredictionResultFeedbackChange change;

    @Column(name = "changed_by_user_id", updatable = false)
    private Long changedByUserId;

    @Column(name = "changed_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime changedAt;

    public PredictionResultFeedbackRevision(PredictionResultFeedback answer, PredictionResultFeedbackChange change,
            Long changedByUserId, OffsetDateTime changedAt) {
        this.feedbackId = answer.getId();
        this.resultId = answer.getResult().getId();
        this.reviewId = answer.getReview() == null ? null : answer.getReview().getId();
        this.userId = answer.getUser() == null ? null : answer.getUser().getId();
        this.visitorId = answer.getVisitor() == null ? null : answer.getVisitor().getId();
        this.type = answer.getType();
        this.order = answer.getOrder();
        this.value = change == PredictionResultFeedbackChange.DELETED ? null : answer.getValue();
        this.change = change;
        this.changedByUserId = changedByUserId;
        this.changedAt = changedAt;
    }
}
