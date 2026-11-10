package dev.ulloasp.mlsuite.schema.domain.model;

import jakarta.persistence.PrePersist;
import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.model.domain.model.Model;
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
@Table(name = "prediction_result", uniqueConstraints = {
        @UniqueConstraint(name = "uq_prediction_result_run_model", columnNames = { "prediction_run_id", "model_id" })
})
@Getter
@Setter
@NoArgsConstructor
public class PredictionResult {

    public PredictionResult(PredictionRun run, Model model, Map<String, Object> modelInput,
            Map<String, Object> output, PredictionResultStatus status, String errorMessage,
            Map<String, Object> errorJson) {
        this.run = run;
        this.model = model;
        this.modelInput = modelInput;
        this.output = output;
        this.status = status;
        this.errorMessage = errorMessage;
        this.errorJson = errorJson;
        // The model ran in its environment; the result keeps which one for good.
        this.environmentKey = model.getEnvironmentKey();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "prediction_run_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_result_run"))
    private PredictionRun run;

    @ManyToOne(optional = false)
    @JoinColumn(name = "model_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_result_model"))
    private Model model;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "model_input", nullable = false)
    private Map<String, Object> modelInput;

    @JdbcTypeCode(SqlTypes.JSON)
    /** Null for a failed result. */
    @Column(name = "output")
    private Map<String, Object> output;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PredictionResultStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "error_detail")
    private Map<String, Object> errorJson;

    /** The runtime environment that computed this result. */
    @Column(name = "environment_key", nullable = false, length = 64, updatable = false)
    private String environmentKey;

    /** The SHA-256 of the seal a workspace result was saved from; one seal is saved once. */
    @Setter
    @Column(name = "attestation_sha256", updatable = false, length = 64)
    private String attestationSha256;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    /** Carried from its parent for the composite foreign key that keeps it there. */
    @Column(name = "schema_version_id", nullable = false, updatable = false)
    private Long schemaVersionId;

    @PrePersist
    void carryParentKeys() {
        schemaVersionId = run.getSchemaVersion().getId();
    }
}
