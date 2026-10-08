package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.visitor.domain.model.Visitor;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ForeignKey;
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
 * {@code user} and {@code visitor} is set. Each author gives one answer per result, type and
 * order; the database holds that uniqueness in one partial index per kind of author.
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
