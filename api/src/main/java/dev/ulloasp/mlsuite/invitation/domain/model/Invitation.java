package dev.ulloasp.mlsuite.invitation.domain.model;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "invitation")
public class Invitation {

    public Invitation(
            Organization organization,
            String email,
            RoleDefinition roleDefinition,
            Principal createdBy,
            OffsetDateTime expiresAt) {
        this.organization = organization;
        this.email = email;
        this.roleDefinition = roleDefinition;
        this.status = InvitationStatus.PENDING;
        this.createdBy = createdBy;
        this.updatedBy = createdBy;
        this.expiresAt = expiresAt;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false, foreignKey = @ForeignKey(name = "fk_invitation_org"))
    private Organization organization;

    @Column(name = "email", nullable = false, length = 200)
    private String email;

    @ManyToOne(optional = false)
    @JoinColumn(name = "role_definition_id", nullable = false, foreignKey = @ForeignKey(name = "fk_invitation_role_definition"))
    private RoleDefinition roleDefinition;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private InvitationStatus status;

    /** Null once the person who invited is gone. */
    /** Who created it. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by_principal_id", nullable = false, updatable = false)
    private Principal createdBy;

    /** Who changed it last. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "updated_by_principal_id", nullable = false)
    private Principal updatedBy;

    @Column(name = "expires_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;

    /** The status as of {@code now}: a pending invitation whose time has passed is expired. */
    public InvitationStatus statusAt(OffsetDateTime now) {
        return status == InvitationStatus.PENDING && expiresAt.isBefore(now) ? InvitationStatus.EXPIRED : status;
    }
}
