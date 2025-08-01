package dev.ulloasp.mlsuite.analyzer.entities;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "prediction")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Prediction {

        public Prediction(Signature signature, Object data, Object prediction) {
                this.signature = signature;
                this.data = data;
                this.prediction = prediction;
        }

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @ManyToOne(optional = false)
        @JoinColumn(name = "signature_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_signature", foreignKeyDefinition = "FOREIGN KEY (signature_id) REFERENCES signature(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
        private Signature signature;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "data", nullable = false, columnDefinition = "jsonb")
        private Object data;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "prediction", nullable = false, columnDefinition = "jsonb")
        private Object prediction;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "real_value", nullable = true, columnDefinition = "jsonb")
        private Object realValue;

        @Column(name = "created_at", nullable = false, updatable = false)
        @CreationTimestamp
        private OffsetDateTime createdAt;

        @Column(name = "updated_at", nullable = false)
        @UpdateTimestamp
        private OffsetDateTime updatedAt;
}
