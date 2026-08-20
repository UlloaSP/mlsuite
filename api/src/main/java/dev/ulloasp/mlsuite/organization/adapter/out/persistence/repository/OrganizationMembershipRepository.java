package dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;

@Repository
public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, Long> {

    @Query("SELECT m FROM OrganizationMembership m WHERE m.organization.id = :organizationId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE ORDER BY m.createdAt ASC")
    List<OrganizationMembership> findActiveByOrganizationIdOrderByCreatedAtAsc(Long organizationId);

    @Query("SELECT m FROM OrganizationMembership m WHERE m.user.id = :userId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE ORDER BY m.organization.name ASC")
    List<OrganizationMembership> findActiveByUserId(Long userId);

    @Query("""
            SELECT m FROM OrganizationMembership m
            WHERE m.user.id = :userId
            AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE
            AND (
                lower(m.organization.name) LIKE lower(concat('%', :search, '%'))
                OR lower(m.organization.slug) LIKE lower(concat('%', :search, '%'))
                OR lower(coalesce(m.organization.description, '')) LIKE lower(concat('%', :search, '%'))
            )
            """)
    List<OrganizationMembership> searchActiveByUserId(Long userId, String search, Pageable pageable);

    @Query("SELECT m FROM OrganizationMembership m WHERE m.organization.id = :organizationId AND m.user.id = :userId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE")
    Optional<OrganizationMembership> findActiveByOrganizationIdAndUserId(Long organizationId, Long userId);

    Optional<OrganizationMembership> findByOrganizationIdAndUserId(Long organizationId, Long userId);

    @Query("SELECT m FROM OrganizationMembership m WHERE m.id = :membershipId AND m.organization.id = :organizationId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE")
    Optional<OrganizationMembership> findActiveByIdAndOrganizationId(Long membershipId, Long organizationId);

    @Query("SELECT COUNT(m) FROM OrganizationMembership m WHERE m.organization.id = :organizationId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE")
    long countActiveByOrganizationId(Long organizationId);

    @Query("SELECT COUNT(m) FROM OrganizationMembership m WHERE m.roleDefinition.id = :roleDefinitionId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE")
    long countActiveByRoleDefinitionId(Long roleDefinitionId);

    @Query("SELECT m FROM OrganizationMembership m WHERE m.roleDefinition.id = :roleDefinitionId AND m.status = dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE")
    List<OrganizationMembership> findActiveByRoleDefinitionId(Long roleDefinitionId);

    List<OrganizationMembership> findByRoleDefinitionId(Long roleDefinitionId);

    List<OrganizationMembership> findByOrganizationId(Long organizationId);
}
