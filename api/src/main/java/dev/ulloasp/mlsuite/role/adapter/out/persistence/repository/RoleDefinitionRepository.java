package dev.ulloasp.mlsuite.role.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;

@Repository
public interface RoleDefinitionRepository
        extends JpaRepository<RoleDefinition, Long>, JpaSpecificationExecutor<RoleDefinition> {

    List<RoleDefinition> findByOrganizationIdOrderByLockedDescNameAsc(Long organizationId);

    Optional<RoleDefinition> findByOrganizationIdAndSystemKey(Long organizationId, String systemKey);

    Optional<RoleDefinition> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);

    List<RoleDefinition> findByOrganizationId(Long organizationId);

    long countByOrganizationId(Long organizationId);
}
