package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    boolean existsBySlug(String slug);

    Optional<Organization> findBySlug(String slug);
}
