package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationLogo;

@Repository
public interface OrganizationLogoRepository extends JpaRepository<OrganizationLogo, Long> {
}
