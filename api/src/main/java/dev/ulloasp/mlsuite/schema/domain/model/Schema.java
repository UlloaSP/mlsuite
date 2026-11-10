package dev.ulloasp.mlsuite.schema.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "schema", uniqueConstraints = {
        @UniqueConstraint(name = "uq_schema_org_name", columnNames = { "organization_id", "name" })
})
@Getter
@Setter
@NoArgsConstructor
public class Schema {

    public Schema(Organization organization, String name, String description, Principal createdBy) {
        this.organization = organization;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.name = name;
        this.description = description;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false, foreignKey = @ForeignKey(name = "fk_schema_org"))
    private Organization organization;

    @Column(name = "name", nullable = false, length = 180)
    private String name;

    @Column(name = "description", length = 800)
    private String description;

    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    @Column(name = "archived_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime archivedAt;

    /** When a purge of it was asked for; written only by the purge, so saving this row never clears it. */
    @Column(name = "purging_at", insertable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime purgingAt;
}
