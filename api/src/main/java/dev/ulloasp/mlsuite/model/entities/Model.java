/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.entities;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.user.entity.User;
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

@Table(name = "model", uniqueConstraints = {
        @UniqueConstraint(name = "uq_model_name_organization", columnNames = { "name", "organization_id" })
})
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Model {

    public Model(
            Organization organization,
            User createdBy,
            String name,
            String type,
            String specific_type,
            String fileName,
            byte[] modelFile) {
        this.organization = organization;
        this.createdBy = createdBy;
        this.name = name;
        this.type = type;
        this.specificType = specific_type;
        this.fileName = fileName;
        this.modelFile = modelFile;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "type", nullable = false, length = 255)
    private String type;

    @Column(name = "specific_type", nullable = false, length = 255)
    private String specificType;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "model_file", nullable = false)
    private byte[] modelFile;

    @Column(name = "storage_bucket", length = 100)
    private String storageBucket;

    @Column(name = "storage_object_key", length = 512)
    private String storageObjectKey;

    @Column(name = "storage_etag", length = 128)
    private String storageEtag;

    @Column(name = "model_size_bytes")
    private Long modelSizeBytes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    public boolean hasStoredObject() {
        return this.storageBucket != null
                && !this.storageBucket.isBlank()
                && this.storageObjectKey != null
                && !this.storageObjectKey.isBlank();
    }

    public boolean hasInlineModelFile() {
        return this.modelFile != null && this.modelFile.length > 0;
    }

    public User getUser() {
        return createdBy;
    }

    public void setUser(User user) {
        this.createdBy = user;
    }
}
