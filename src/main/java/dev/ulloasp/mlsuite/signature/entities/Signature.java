package dev.ulloasp.mlsuite.signature.entities;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.Check;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.model.entities.Model;
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
                @UniqueConstraint(name = "uq_signature_model", columnNames = { "model_id", "input_signature" }),
                @UniqueConstraint(name = "uq_version_signature", columnNames = { "model_id", "major", "minor",
                                "patch" })
})
@Check(constraints = "major >= 0 AND minor >= 0 AND patch >= 0")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Signature {

        public Signature(Model model, String name, Map<String, Object> inputSignature) {
                this.model = model;
                this.name = name;
                this.inputSignature = inputSignature;
        }

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @ManyToOne(optional = false)
        @JoinColumn(name = "model_id", nullable = false, foreignKey = @ForeignKey(name = "fk_signature_model", foreignKeyDefinition = "FOREIGN KEY (model_id) REFERENCES model(id) ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE"))
        private Model model;

        @Column(name = "name", nullable = false, length = 255)
        private String name;

        @Column(name = "major", nullable = false)
        private int major;

        @Column(name = "minor", nullable = false)
        private int minor;

        @Column(name = "patch", nullable = false)
        private int patch;

        @ManyToOne
        @JoinColumn(name = "origin", referencedColumnName = "id", foreignKey = @ForeignKey(name = "fk_origin_signature", foreignKeyDefinition = "FOREIGN KEY (origin) REFERENCES signature(id) ON DELETE SET NULL ON UPDATE CASCADE DEFERRABLE"))
        private Signature origin;

        @JdbcTypeCode(SqlTypes.JSON)
        @Column(name = "input_signature", nullable = false)
        private Map<String, Object> inputSignature;

        @CreationTimestamp
        @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
        private OffsetDateTime createdAt;

        @UpdateTimestamp
        @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
        private OffsetDateTime updatedAt;
}
