package dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;

@Repository
public interface InvitationRepository
        extends JpaRepository<Invitation, Long>, JpaSpecificationExecutor<Invitation> {

    List<Invitation> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    List<Invitation> findByEmailAndStatusOrderByCreatedAtDesc(String email, InvitationStatus status);

    long countByOrganizationIdAndStatus(Long organizationId, InvitationStatus status);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndStatusAndExpiresAtAfter(Long organizationId, InvitationStatus status,
            OffsetDateTime expiresAt);

    List<Invitation> findByRoleDefinitionId(Long roleDefinitionId);
}
