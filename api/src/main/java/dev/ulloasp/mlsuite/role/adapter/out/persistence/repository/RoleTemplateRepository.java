package dev.ulloasp.mlsuite.role.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.role.domain.model.RoleTemplate;

@Repository
public interface RoleTemplateRepository extends JpaRepository<RoleTemplate, Long> {

    Optional<RoleTemplate> findBySlug(String slug);

    List<RoleTemplate> findByScopeOrderByNameAsc(RoleScope scope);
}
