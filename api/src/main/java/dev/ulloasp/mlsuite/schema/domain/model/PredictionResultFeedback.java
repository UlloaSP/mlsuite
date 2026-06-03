package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.user.domain.model.User;
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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "prediction_result_feedback", uniqueConstraints = {
        @UniqueConstraint(name = "uq_result_feedback_type_order_user", columnNames = {
                "prediction_result_id", "feedback_type", "orden", "user_id" })
})
public class PredictionResultFeedback {

    public PredictionResultFeedback(PredictionResult result, User user, PredictionResultFeedbackType type,
            int order, JsonNode value) {
        this.result = result;
        this.user = user;
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

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_result_feedback_user"))
    private User user;

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
