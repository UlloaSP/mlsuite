/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
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
import jakarta.persistence.SecondaryTable;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@SecondaryTable(name = "model_preparation", pkJoinColumns = @PrimaryKeyJoinColumn(name = "model_id"))
@Table(name = "model", uniqueConstraints = {
        @UniqueConstraint(name = "uq_model_name_org", columnNames = { "name", "organization_id" })
})
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Model {

    public Model(Principal createdBy, String name, String type, String specific_type, String fileName) {
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.name = name;
        this.type = type;
        this.specificType = specific_type;
        this.fileName = fileName;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(name = "lock_version", nullable = false)
    private Long version;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** When a purge of it was asked for; written only by the purge, so saving this row never clears it. */
    @Column(name = "purging_at", insertable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime purgingAt;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false, foreignKey = @ForeignKey(name = "fk_model_organization"))
    private Organization organization;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "type", nullable = false, length = 255)
    private String type;

    @Column(name = "specific_type", nullable = false, length = 255)
    private String specificType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_bucket", nullable = false, length = 100)
    private String storageBucket;

    @Column(name = "storage_object_key", nullable = false, length = 512)
    private String storageObjectKey;

    @Column(name = "storage_etag", nullable = false, length = 128)
    private String storageEtag;

    @Column(name = "size_bytes", nullable = false)
    private Long modelSizeBytes;

    @Column(name = "artifact_sha256", nullable = false, length = 64)
    private String artifactSha256;

    @Column(name = "storage_version_id", nullable = false, length = 255)
    private String storageVersionId;

    @Column(name = "artifact_verified_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime artifactVerifiedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_schema", nullable = false)
    private Map<String, Object> inputSchema = Map.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "bundle_manifest", nullable = false)
    private Map<String, Object> bundleManifest = Map.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "feature_importances")
    private List<Map<String, Object>> featureImportances;

    /** The {@link RuntimeEnvironment} the model runs in. */
    @Column(name = "environment_key", nullable = false, length = 64)
    private String environmentKey;

    @Enumerated(EnumType.STRING)
    @Column(table = "model_preparation", name = "state", nullable = false, length = 16)
    private ModelRuntimeState runtimeState = ModelRuntimeState.READY;

    @Column(table = "model_preparation", name = "error_message")
    private String runtimeError;

    @Column(table = "model_preparation", name = "attempts", nullable = false)
    private int runtimeAttempts;

    @Column(table = "model_preparation", name = "lease_owner", length = 128)
    private String runtimeLeaseOwner;

    @Column(table = "model_preparation", name = "lease_expires_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime runtimeLeaseExpiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    @Column(name = "archived_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime archivedAt;
}
