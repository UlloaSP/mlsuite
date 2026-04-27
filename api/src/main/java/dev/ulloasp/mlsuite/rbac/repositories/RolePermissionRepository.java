package dev.ulloasp.mlsuite.rbac.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.rbac.entities.RolePermission;
import dev.ulloasp.mlsuite.rbac.entities.RolePermissionId;

public interface RolePermissionRepository extends JpaRepository<RolePermission, RolePermissionId> {

    List<RolePermission> findByRoleId(Long roleId);
}
