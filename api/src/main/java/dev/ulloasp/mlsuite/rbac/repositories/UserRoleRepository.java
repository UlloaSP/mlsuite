package dev.ulloasp.mlsuite.rbac.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.rbac.entities.UserRole;
import dev.ulloasp.mlsuite.rbac.entities.UserRoleId;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    List<UserRole> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    List<UserRole> findByUserIdAndOrganizationIdIn(Long userId, List<Long> organizationIds);
}
