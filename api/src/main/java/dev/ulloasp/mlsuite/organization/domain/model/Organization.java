package dev.ulloasp.mlsuite.organization.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.user.domain.model.User;
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
@Getter
@Setter
@NoArgsConstructor
@Table(name = "organization", uniqueConstraints = {
        @UniqueConstraint(name = "uq_organization_slug", columnNames = "slug")
})
public class Organization {

    public Organization(String slug, String name, String description, User createdBy) {
        this.slug = slug;
        this.name = name;
        this.description = description;
        this.createdBy = createdBy;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slug", nullable = false, length = 120)
    private String slug;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", length = 600)
    private String description;

    /** When the logo in {@code organization_logo} was last replaced; null while there is none. */
    @Column(name = "logo_updated_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime logoUpdatedAt;

    @Column(name = "plugin_catalog_indexed", nullable = false)
    private boolean pluginCatalogIndexed;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_organization_creator"))
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "updated_by_user_id", foreignKey = @ForeignKey(name = "fk_organization_updated_by"))
    private User updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
