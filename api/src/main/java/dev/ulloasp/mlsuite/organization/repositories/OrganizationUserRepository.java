package dev.ulloasp.mlsuite.organization.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.organization.entities.OrganizationUser;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUserId;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUserStatus;

public interface OrganizationUserRepository extends JpaRepository<OrganizationUser, OrganizationUserId> {

    List<OrganizationUser> findByUserIdAndStatusOrderByOrganizationNameAsc(Long userId, OrganizationUserStatus status);

    Optional<OrganizationUser> findByUserIdAndOrganizationSlug(Long userId, String slug);

    boolean existsByUserIdAndOrganizationIdAndStatus(Long userId, Long organizationId, OrganizationUserStatus status);
}
