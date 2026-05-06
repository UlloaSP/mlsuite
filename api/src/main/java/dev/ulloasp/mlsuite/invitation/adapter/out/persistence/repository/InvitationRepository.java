package dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    List<Invitation> findByOrganizationIdOrderByCreatedAtDesc(Long organizationId);

    Optional<Invitation> findByToken(String token);

    List<Invitation> findByOrganizationIdAndStatus(Long organizationId, InvitationStatus status);

    List<Invitation> findByEmailAndStatusOrderByCreatedAtDesc(String email, InvitationStatus status);

    long countByOrganizationIdAndStatus(Long organizationId, InvitationStatus status);
}
