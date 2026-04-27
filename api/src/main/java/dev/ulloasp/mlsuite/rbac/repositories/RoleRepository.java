package dev.ulloasp.mlsuite.rbac.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.rbac.entities.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByOrganizationIdAndName(Long organizationId, String name);

    List<Role> findByOrganizationIdOrderByNameAsc(Long organizationId);
}
