/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.entities;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.signature.entities.Signature;
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
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "prediction", uniqueConstraints = {
                @UniqueConstraint(name = "uq_prediction_signature_name", columnNames = { "signature_id", "name" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Prediction {

        public Prediction(Signature signature, String name, Map<String, Object> data, Map<String, Object> prediction) {
                this.signature = signature;
                this.name = name;
                this.data = data;
                this.prediction = prediction;
        }

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @ManyToOne(optional = false)
        @JoinColumn(name = "signature_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_signature", foreignKeyDefinition = "FOREIGN KEY (signature_id) REFERENCES signature(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
        private Signature signature;

        @Column(name = "name", nullable = false, length = 255)
        private String name;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "data", nullable = false)
        private Map<String, Object> data;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "prediction", nullable = false)
        private Map<String, Object> prediction;

        @Enumerated(EnumType.ORDINAL)
        @Column(name = "status", nullable = false)
        private PredictionStatus status = PredictionStatus.PENDING;

        @Column(name = "created_at", nullable = false, updatable = false)
        @CreationTimestamp
        private OffsetDateTime createdAt;

        @Column(name = "updated_at", nullable = false)
        @UpdateTimestamp
        private OffsetDateTime updatedAt;
}
