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
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "signature", uniqueConstraints = {
                @UniqueConstraint(name = "uq_signature_model", columnNames = { "model_id", "input_signature",
                                "output_signature" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Signature {

        public Signature(Model model, Long version, String inputSignature) {
                this.model = model;
                this.version = version;
                this.inputSignature = inputSignature;
        }

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @ManyToOne(optional = false)
        @JoinColumn(name = "model_id", nullable = false, foreignKey = @ForeignKey(name = "fk_signature_model", foreignKeyDefinition = "FOREIGN KEY (model_id) REFERENCES model(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
        private Model model;

        @Column(name = "version", nullable = false, columnDefinition = "BIGINT DEFAULT 1")
        private Long version;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "input_signature", nullable = false, columnDefinition = "jsonb")
        private String inputSignature;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "output_signature", nullable = true, columnDefinition = "jsonb")
        private String outputSignature;

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
        private OffsetDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
        private OffsetDateTime updatedAt;
}
