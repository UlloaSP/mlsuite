package dev.ulloasp.mlsuite.organization.domain.model;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.organization.domain.exception.PersonalAccountException;
import dev.ulloasp.mlsuite.user.domain.model.User;
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

    /** The namespace {@code owner} works in on their own, named after them. */
    public static Organization personal(User owner) {
        Organization organization = new Organization(owner.getUsername(), owner.getFullName(), null, owner);
        organization.kind = OrganizationKind.PERSONAL;
        organization.ownerUser = owner;
        return organization;
    }

    public boolean isPersonal() {
        return kind == OrganizationKind.PERSONAL;
    }

    /** The handle of the profile behind a personal account, while anyone may read that profile. */
    public String profileHandle() {
        return isPersonal() ? ownerUser.visibleHandle() : null;
    }

    /** Refuses, with {@code refusal} as the reason, what a personal account cannot do. */
    public void requireTeam(String refusal) {
        if (isPersonal()) {
            throw new PersonalAccountException(refusal);
        }
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

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 16)
    private OrganizationKind kind = OrganizationKind.TEAM;

    /** Whose personal account this is; null for a team, whose owner is a membership. */
    @ManyToOne
    @JoinColumn(name = "owner_user_id", foreignKey = @ForeignKey(name = "fk_organization_owner_user"))
    private User ownerUser;

    /** When the logo in {@code organization_logo} was last replaced; null while there is none. */
    @Column(name = "logo_updated_at", columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime logoUpdatedAt;

    @Column(name = "plugin_catalog_indexed", nullable = false)
    private boolean pluginCatalogIndexed;

    /** The calls its API clients may make in a calendar month; null follows the instance default. */
    @Column(name = "api_monthly_call_limit")
    private Integer apiMonthlyCallLimit;

    /** Null once the person who created it is gone. */
    @ManyToOne
    @JoinColumn(name = "created_by_user_id", foreignKey = @ForeignKey(name = "fk_organization_creator"))
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "updated_by_user_id", foreignKey = @ForeignKey(name = "fk_organization_updated_by"))
    private User updatedBy;

    /** When a purge of it was asked for; written only by the purge, so saving this row never clears it. */
    @Column(name = "purging_at", insertable = false, updatable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime purgingAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
