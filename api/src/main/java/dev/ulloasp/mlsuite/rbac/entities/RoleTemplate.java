package dev.ulloasp.mlsuite.rbac.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
        @UniqueConstraint(name = "uq_role_template_name", columnNames = "name")
})
public class RoleTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "is_system", nullable = false)
    private boolean system;

    public RoleTemplate(String name, boolean system) {
        this.name = name;
        this.system = system;
    }
}
