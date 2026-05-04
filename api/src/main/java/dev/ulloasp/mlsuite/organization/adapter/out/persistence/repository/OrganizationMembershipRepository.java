package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;

@Repository
public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, Long> {

    List<OrganizationMembership> findByOrganizationIdAndStatusOrderByCreatedAtAsc(Long organizationId, MembershipStatus status);

    @Query("SELECT m FROM OrganizationMembership m WHERE m.user.id = :userId AND m.status = 'ACTIVE' ORDER BY m.organization.name ASC")
    List<OrganizationMembership> findActiveByUserId(Long userId);

    Optional<OrganizationMembership> findByOrganizationIdAndUserId(Long organizationId, Long userId);
}
