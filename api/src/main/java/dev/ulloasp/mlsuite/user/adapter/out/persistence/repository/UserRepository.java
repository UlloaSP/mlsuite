/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countBySystemRoleAndEnabledTrue(SystemRole systemRole);

    @Query("""
            SELECT u FROM User u
            WHERE u.enabled = true
            AND NOT EXISTS (
                SELECT 1 FROM OrganizationMembership m
                WHERE m.organization.id = :organizationId
                AND m.user.id = u.id
                AND m.status = :status
            )
            ORDER BY LOWER(u.fullName) ASC, LOWER(u.email) ASC
            """)
    List<User> findEnabledUsersOutsideOrganization(
            @Param("organizationId") Long organizationId,
            @Param("status") MembershipStatus status);

    @Modifying
    @Query("UPDATE User u SET u.currentOrganization = null WHERE u.currentOrganization.id = :organizationId")
    void clearCurrentOrganization(@Param("organizationId") Long organizationId);
}
