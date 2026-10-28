package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.review.domain.model.SchemaReview;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.visitor.domain.model.Visitor;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One answer about one result, by a member or by a visitor of a public page: exactly one of
 * {@code user} and {@code visitor} is set. An answer given in a review belongs to that review
 * ({@code review}); one given on a public page belongs to none. Each author gives one answer per
 * result, type and order in each review and once outside reviews; the database holds that
 * uniqueness in one partial index per kind of author. Every change is kept in its history
 * (PredictionResultFeedbackRevision).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "prediction_result_feedback")
public class PredictionResultFeedback {

    public PredictionResultFeedback(PredictionResult result, User user, PredictionResultFeedbackType type,
            int order, JsonNode value) {
        this.result = result;
        this.user = user;
        this.type = type;
        this.order = order;
        this.value = value;
    }

    /** A reviewer's answer in a review. */
    public PredictionResultFeedback(PredictionResult result, User user, SchemaReview review,
            PredictionResultFeedbackType type, int order, JsonNode value) {
        this(result, user, type, order, value);
        this.review = review;
    }

    public PredictionResultFeedback(PredictionResult result, Visitor visitor, PredictionResultFeedbackType type,
            int order, JsonNode value) {
        this.result = result;
        this.visitor = visitor;
        this.type = type;
        this.order = order;
        this.value = value;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "prediction_result_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_result_feedback_result"))
    private PredictionResult result;

    @ManyToOne
    @JoinColumn(name = "user_id", updatable = false, foreignKey = @ForeignKey(name = "fk_result_feedback_user"))
    private User user;

    @ManyToOne
    @JoinColumn(name = "visitor_id", updatable = false, foreignKey = @ForeignKey(name = "fk_result_feedback_visitor"))
    private Visitor visitor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_review_id", updatable = false,
            foreignKey = @ForeignKey(name = "fk_result_feedback_review"))
    private SchemaReview review;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback_type", nullable = false, length = 32)
    private PredictionResultFeedbackType type;

    @Column(name = "orden", nullable = false)
    private int order;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_value", nullable = false)
    private JsonNode value;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
