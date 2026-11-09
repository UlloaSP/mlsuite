package dev.ulloasp.mlsuite.schema.domain.model;

import jakarta.persistence.PrePersist;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
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
            PredictionRunStatus status, Principal createdBy) {
        this(null, schemaVersion, name, inputData, status, createdBy);
    }

    public PredictionRun(SchemaBookmark schemaBookmark, SchemaVersion schemaVersion, String name,
            Map<String, Object> inputData, PredictionRunStatus status, Principal createdBy) {
        this.schemaBookmark = schemaBookmark;
        this.createdBy = createdBy;
        this.schemaVersion = schemaVersion;
        this.name = name;
        this.inputData = inputData;
        this.status = status;
        this.origin = PredictionRunOrigin.WORKSPACE;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "schema_version_id", nullable = false, foreignKey = @ForeignKey(name = "fk_prediction_run_version"))
    private SchemaVersion schemaVersion;

    @ManyToOne
    @JoinColumn(name = "schema_bookmark_id", foreignKey = @ForeignKey(name = "fk_prediction_run_bookmark"))
    private SchemaBookmark schemaBookmark;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_data", nullable = false)
    private Map<String, Object> inputData;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PredictionRunStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "origin", nullable = false, length = 16, updatable = false)
    private PredictionRunOrigin origin;

    /** Who made it: a member, a visitor of a public page, or an API client. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** The name its author is shown by; null for a visitor. */
    public String getCreatedByName() {
        return createdBy.label();
    }

    /** The address of the member who made it, while they have an account. */
    public String getCreatedByEmail() {
        return createdBy.email();
    }

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    /** Carried from its parent for the composite foreign key that keeps it there. */
    @Column(name = "schema_id", nullable = false, updatable = false)
    private Long schemaId;

    /** The organization of its schema, carried for the composite key and tenant listings. */
    @Column(name = "organization_id", nullable = false, updatable = false)
    private Long organizationId;

    /** The client an API run was made with; the database keeps it to the run's organization. */
    @Column(name = "api_client_id", updatable = false)
    private Long apiClientId;

    /** The author's kind, which the database checks the origin against. */
    @Column(name = "created_by_kind", nullable = false, updatable = false, length = 16)
    private String createdByKind;

    @PrePersist
    void carryParentKeys() {
        schemaId = schemaVersion.getSchema().getId();
        organizationId = schemaVersion.getSchema().getOrganization().getId();
        createdByKind = createdBy.getKind().name();
        apiClientId = createdBy.getApiClientId();
    }
}
