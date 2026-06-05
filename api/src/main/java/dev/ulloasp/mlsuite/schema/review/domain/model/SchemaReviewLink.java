package dev.ulloasp.mlsuite.schema.review.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
@Getter
@Setter
@NoArgsConstructor
@Table(name = "schema_review_link", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_review_link_token_hash", columnNames = "token_hash")
})
public class SchemaReviewLink {
    public SchemaReviewLink(Organization organization, Schema schema, SchemaVersion schemaVersion,
            User createdBy, String tokenHash, OffsetDateTime expiresAt) {
        this.organization = organization;
        this.schema = schema;
        this.schemaVersion = schemaVersion;
        this.createdBy = createdBy;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_link_org"))
    private Organization organization;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_link_schema"))
    private Schema schema;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "schema_version_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_link_version"))
    private SchemaVersion schemaVersion;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_review_link_created_by"))
    private User createdBy;

    @Column(name = "token_hash", nullable = false, length = 128)
    private String tokenHash;

    @Column(name = "token", length = 4096)
    private String token;

    @Column(name = "expires_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime expiresAt;

    @Column(name = "revoked_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime revokedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
