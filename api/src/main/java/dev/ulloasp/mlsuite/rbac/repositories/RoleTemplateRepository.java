package dev.ulloasp.mlsuite.rbac.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.rbac.entities.RoleTemplate;

public interface RoleTemplateRepository extends JpaRepository<RoleTemplate, Integer> {

    Optional<RoleTemplate> findByName(String name);
}
