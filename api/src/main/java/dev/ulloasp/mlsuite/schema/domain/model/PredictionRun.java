package dev.ulloasp.mlsuite.schema.domain.model;

import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

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
@Table(name = "prediction_run", uniqueConstraints = {
        @UniqueConstraint(name = "uq_prediction_run_version_name", columnNames = { "schema_version_id", "name" })
})
@Getter
@Setter
@NoArgsConstructor
public class PredictionRun {

    public PredictionRun(SchemaVersion schemaVersion, String name, Map<String, Object> inputData,
            PredictionRunStatus status) {
        this.schemaVersion = schemaVersion;
        this.name = name;
        this.inputData = inputData;
        this.status = status;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_version_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_run_version"))
    private SchemaVersion schemaVersion;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_data_json", nullable = false)
    private Map<String, Object> inputData;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PredictionRunStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
