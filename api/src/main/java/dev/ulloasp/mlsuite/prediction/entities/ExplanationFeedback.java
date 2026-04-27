/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.entities;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "explanation_feedback", uniqueConstraints = {
        @UniqueConstraint(name = "uq_explanation_feedback_prediction_order", columnNames = { "prediction_id", "orden" })
})
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ExplanationFeedback {

    public ExplanationFeedback(Prediction prediction, int order, JsonNode value) {
        this.prediction = prediction;
        this.order = order;
        this.value = value;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "prediction_id", nullable = false, foreignKey = @ForeignKey(name = "fk_explanation_feedback_prediction", foreignKeyDefinition = "FOREIGN KEY (prediction_id) REFERENCES prediction(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
    private Prediction prediction;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "orden", nullable = false)
    private int order;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "data_value", nullable = false)
    private JsonNode value;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "real_value")
    private JsonNode realValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
