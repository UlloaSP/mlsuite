package dev.ulloasp.mlsuite.rbac.entities;

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
@Table(name = "permission", uniqueConstraints = {
        @UniqueConstraint(name = "uq_permission_resource_action", columnNames = { "resource", "action" })
})
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private PermissionGroup group;

    @Column(name = "resource", nullable = false, length = 50)
    private String resource;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    public Permission(PermissionGroup group, String resource, String action) {
        this.group = group;
        this.resource = resource;
        this.action = action;
    }

    public String key() {
        return resource + ":" + action;
    }
}
