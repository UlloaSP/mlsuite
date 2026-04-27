package dev.ulloasp.mlsuite.organization.entities;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
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
@IdClass(OrganizationUserId.class)
@Table(name = "organization_user")
public class OrganizationUser {

    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Id
    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private OrganizationUserStatus status = OrganizationUserStatus.ACTIVE;

    @Column(name = "joined_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime joinedAt = OffsetDateTime.now();

    public OrganizationUser(Organization organization, User user, OrganizationUserStatus status) {
        this.organization = organization;
        this.user = user;
        this.status = status;
        this.joinedAt = OffsetDateTime.now();
    }
}
