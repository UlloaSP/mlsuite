package dev.ulloasp.mlsuite.rbac.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.rbac.entities.Permission;

public interface PermissionRepository extends JpaRepository<Permission, Integer> {

    Optional<Permission> findByResourceAndAction(String resource, String action);
}
