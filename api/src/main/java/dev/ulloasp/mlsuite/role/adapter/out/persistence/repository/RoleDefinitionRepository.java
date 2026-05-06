package dev.ulloasp.mlsuite.role.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;

@Repository
public interface RoleDefinitionRepository extends JpaRepository<RoleDefinition, Long> {

    List<RoleDefinition> findByOrganizationIdAndScopeOrderByLockedDescNameAsc(Long organizationId, RoleScope scope);

    List<RoleDefinition> findByTeamIdAndScopeOrderByLockedDescNameAsc(Long teamId, RoleScope scope);

    Optional<RoleDefinition> findByOrganizationIdAndSystemKey(Long organizationId, String systemKey);

    Optional<RoleDefinition> findByTeamIdAndSystemKey(Long teamId, String systemKey);

    Optional<RoleDefinition> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<RoleDefinition> findByIdAndTeamId(Long id, Long teamId);

    boolean existsByOrganizationIdAndScopeAndSlug(Long organizationId, RoleScope scope, String slug);
}
