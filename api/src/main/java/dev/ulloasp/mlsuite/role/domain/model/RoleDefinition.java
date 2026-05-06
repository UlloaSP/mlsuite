package dev.ulloasp.mlsuite.role.domain.model;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "role_definition", uniqueConstraints = {
        @UniqueConstraint(name = "uq_role_org_scope_slug", columnNames = { "organization_id", "scope", "slug" }),
        @UniqueConstraint(name = "uq_role_team_scope_slug", columnNames = { "team_id", "scope", "slug" })
})
public class RoleDefinition {

    public RoleDefinition(Organization org, Team team, RoleScope scope, String name, String slug, String systemKey) {
        this.organization = org;
        this.team = team;
        this.scope = scope;
        this.name = name;
        this.slug = slug;
        this.systemKey = systemKey;
        this.locked = systemKey != null;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "organization_id", foreignKey = @ForeignKey(name = "fk_role_org"))
    private Organization organization;

    @ManyToOne
    @JoinColumn(name = "team_id", foreignKey = @ForeignKey(name = "fk_role_team"))
    private Team team;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 32)
    private RoleScope scope;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "slug", nullable = false, length = 120)
    private String slug;

    @Column(name = "description", length = 600)
    private String description;

    @Column(name = "locked", nullable = false)
    private boolean locked;

    @Column(name = "system_key", length = 64)
    private String systemKey;

    @ManyToOne
    @JoinColumn(name = "created_by_user_id", foreignKey = @ForeignKey(name = "fk_role_created_by"))
    private User createdBy;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permission", joinColumns = @JoinColumn(name = "role_definition_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "permission_key", nullable = false, length = 80)
    private Set<PermissionKey> permissions = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime updatedAt;
}
