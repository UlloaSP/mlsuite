package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
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
        @UniqueConstraint(name = "uq_prediction_result_run_model_signature", columnNames = {
                "prediction_run_id", "model_id", "signature_id" })
})
@Getter
@Setter
@NoArgsConstructor
public class PredictionResult {

    public PredictionResult(PredictionRun run, Model model, Signature signature, Map<String, Object> modelInput,
            Map<String, Object> output, PredictionResultStatus status, String errorMessage,
            Map<String, Object> errorJson) {
        this.run = run;
        this.model = model;
        this.signature = signature;
        this.modelInput = modelInput;
        this.output = output;
        this.status = status;
        this.errorMessage = errorMessage;
        this.errorJson = errorJson;
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

    @ManyToOne(optional = false)
    @JoinColumn(name = "signature_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_result_signature"))
    private Signature signature;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "model_input_json", nullable = false)
    private Map<String, Object> modelInput;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_json", nullable = false)
    private Map<String, Object> output;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PredictionResultStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "error_json")
    private Map<String, Object> errorJson;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
