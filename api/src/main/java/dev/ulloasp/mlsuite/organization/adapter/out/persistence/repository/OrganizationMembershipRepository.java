package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
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

    @Query("""
            SELECT m FROM OrganizationMembership m
            WHERE m.user.id = :userId
            AND m.status = 'ACTIVE'
            AND (
                lower(m.organization.name) LIKE lower(concat('%', :search, '%'))
                OR lower(m.organization.slug) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(m.organization.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<OrganizationMembership> searchActiveByUserId(Long userId, String search, Pageable pageable);

    Optional<OrganizationMembership> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    long countByOrganizationIdAndRoleAndStatus(Long organizationId, dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole role, MembershipStatus status);

    long countByOrganizationIdAndStatus(Long organizationId, MembershipStatus status);

    long countByRoleDefinitionIdAndStatus(Long roleDefinitionId, MembershipStatus status);

    List<OrganizationMembership> findByRoleDefinitionIdAndStatus(Long roleDefinitionId, MembershipStatus status);

    List<OrganizationMembership> findByOrganizationId(Long organizationId);
}
