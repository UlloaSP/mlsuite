package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationLogo;

@Repository
public interface OrganizationLogoRepository extends JpaRepository<OrganizationLogo, Long> {

    Optional<OrganizationLogo> findByOrganizationId(Long organizationId);

    @Modifying
    @Query("DELETE FROM OrganizationLogo l WHERE l.organizationId = :organizationId")
    int deleteByOrganizationId(Long organizationId);
}
