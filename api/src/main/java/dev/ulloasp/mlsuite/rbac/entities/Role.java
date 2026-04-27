package dev.ulloasp.mlsuite.rbac.entities;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "role", uniqueConstraints = {
        @UniqueConstraint(name = "uq_role_organization_name", columnNames = { "organization_id", "name" })
})
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne
    @JoinColumn(name = "template_id")
    private RoleTemplate template;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "is_custom", nullable = false)
    private boolean custom;

    public Role(Organization organization, RoleTemplate template, String name, boolean custom) {
        this.organization = organization;
        this.template = template;
        this.name = name;
        this.custom = custom;
    }
}
