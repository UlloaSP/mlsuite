package dev.ulloasp.mlsuite.organization.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
@Table(name = "organization_membership", uniqueConstraints = {
        @UniqueConstraint(name = "uq_org_membership_org_user", columnNames = { "organization_id", "user_id" })
})
public class OrganizationMembership {

    public OrganizationMembership(Organization organization, User user, RoleDefinition roleDefinition,
            MembershipStatus status, Principal createdBy) {
        this.organization = organization;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.user = user;
        this.roleDefinition = roleDefinition;
        this.status = status;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false, foreignKey = @ForeignKey(name = "fk_org_membership_org"))
    private Organization organization;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_org_membership_user"))
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "role_definition_id", nullable = false, foreignKey = @ForeignKey(name = "fk_org_membership_role_definition"))
    private RoleDefinition roleDefinition;

    /** Who created it; memberships are listed by the hundred and never show it, so it is read only on demand. */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    /** A membership a superadmin acts through without one being stored; it has no author. */
    public static OrganizationMembership unstored(Organization organization, User user, RoleDefinition roleDefinition) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.organization = organization;
        membership.user = user;
        membership.roleDefinition = roleDefinition;
        membership.status = MembershipStatus.ACTIVE;
        return membership;
    }

    public boolean isOwner() {
        return roleDefinition != null && OrganizationRole.OWNER.name().equals(roleDefinition.getSystemKey());
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private MembershipStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
