package dev.ulloasp.mlsuite.rbac.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.rbac.entities.PermissionGroup;

public interface PermissionGroupRepository extends JpaRepository<PermissionGroup, Integer> {

    Optional<PermissionGroup> findByName(String name);
}
