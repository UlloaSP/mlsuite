package dev.ulloasp.mlsuite.role.domain.model;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "role_template", uniqueConstraints = {
        @UniqueConstraint(name = "uq_role_template_slug", columnNames = "slug")
})
public class RoleTemplate {

    public RoleTemplate(String name, String slug, String category, RoleScope scope) {
        this.name = name;
        this.slug = slug;
        this.category = category;
        this.scope = scope;
        this.locked = true;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "slug", nullable = false, length = 120)
    private String slug;

    @Column(name = "description", length = 600)
    private String description;

    @Column(name = "category", nullable = false, length = 80)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 32)
    private RoleScope scope;

    @Column(name = "locked", nullable = false)
    private boolean locked;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_template_permission", joinColumns = @JoinColumn(name = "role_template_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "permission_key", nullable = false, length = 80)
    private Set<PermissionKey> permissionKeys = new LinkedHashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, columnDefinition = "TIMESTAMPTZ")
    private OffsetDateTime createdAt;
}
