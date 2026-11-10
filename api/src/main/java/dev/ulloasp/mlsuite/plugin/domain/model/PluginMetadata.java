package dev.ulloasp.mlsuite.plugin.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "plugin_metadata")
@Getter
@Setter
@NoArgsConstructor
public class PluginMetadata {

    public PluginMetadata(
            String publicId,
            Organization organization,
            String objectKey,
            String fileName,
            String contentType,
            long sizeBytes,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            Principal author,
            String pluginType,
            String kind) {
        this.publicId = publicId;
        this.organization = organization;
        this.objectKey = objectKey;
        this.fileName = fileName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdBy = author;
        this.updatedBy = author;
        this.pluginType = pluginType;
        this.kind = kind;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The random id the plugin's object is stored under, and how the API names the plugin. */
    @Column(name = "public_id", nullable = false, unique = true, updatable = false, length = 64)
    private String publicId;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false, foreignKey = @ForeignKey(name = "fk_plugin_metadata_org"))
    private Organization organization;

    @Column(name = "storage_bucket", nullable = false, length = 100)
    private String storageBucket;

    @Column(name = "storage_object_key", nullable = false, length = 512)
    private String objectKey;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "artifact_sha256", nullable = false, length = 64)
    private String sha256;

    @Column(name = "storage_version_id", nullable = false, length = 255)
    private String storageVersionId;

    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @Column(name = "plugin_type", nullable = false, length = 32)
    private String pluginType;

    @Column(name = "kind", length = 180)
    private String kind;
}
