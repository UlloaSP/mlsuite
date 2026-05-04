package dev.ulloasp.mlsuite.invitation.application.usecase;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.invitation.application.port.in.InvitationManagementUseCase;
import dev.ulloasp.mlsuite.invitation.domain.exception.InvitationNotFoundException;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;
import dev.ulloasp.mlsuite.team.domain.model.TeamRole;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
@Transactional
public class InvitationManagementService implements InvitationManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final InvitationRepository invitationRepository;
    private final TeamRepository teamRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final UserLookupService userLookupService;

    public InvitationManagementService(
            WorkspaceAccessService workspaceAccessService,
            InvitationRepository invitationRepository,
            TeamRepository teamRepository,
            OrganizationMembershipRepository organizationMembershipRepository,
            TeamMembershipRepository teamMembershipRepository,
            UserLookupService userLookupService) {
        this.workspaceAccessService = workspaceAccessService;
        this.invitationRepository = invitationRepository;
        this.teamRepository = teamRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.teamMembershipRepository = teamMembershipRepository;
        this.userLookupService = userLookupService;
    }

    @Override
    public List<InvitationDto> listInvitations(Long userId, Long organizationId) {
        workspaceAccessService.requireAdminOrganization(userId, organizationId);
        return invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                .map(InvitationDto::from)
                .toList();
    }

    @Override
    public InvitationDto createInvitation(Long userId, Long organizationId, CreateInvitationRequest request) {
        User user = workspaceAccessService.requireUser(userId);
        var organization = workspaceAccessService.requireAdminOrganization(userId, organizationId);
        Team team = request.teamId() != null ? teamRepository.findById(request.teamId())
                .filter(candidate -> candidate.getOrganization().getId().equals(organizationId))
                .orElseThrow(() -> new IllegalArgumentException("Team does not belong to organization."))
                : null;
        Invitation invitation = new Invitation(
                organization,
                team,
                request.email().strip().toLowerCase(),
                OrganizationRole.valueOf(request.role().trim().toUpperCase()),
                UUID.randomUUID().toString(),
                user,
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
        return InvitationDto.from(invitationRepository.save(invitation));
    }

    @Override
    public void revokeInvitation(Long userId, Long organizationId, Long invitationId) {
        workspaceAccessService.requireAdminOrganization(userId, organizationId);
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new InvitationNotFoundException(invitationId.toString()));
        if (!invitation.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Invitation does not belong to organization.");
        }
        invitation.setStatus(InvitationStatus.REVOKED);
        invitationRepository.save(invitation);
    }

    @Override
    public InvitationDto acceptInvitation(Long userId, String token) {
        User user = userLookupService.requireById(userId);
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new InvitationNotFoundException(token));
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Invitation is not pending.");
        }
        if (invitation.getExpiresAt().isBefore(OffsetDateTime.now(ZoneOffset.UTC))) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
            throw new IllegalArgumentException("Invitation expired.");
        }
        if (!user.getEmail().equalsIgnoreCase(invitation.getEmail())) {
            throw new IllegalArgumentException("Invitation email does not match current user.");
        }

        organizationMembershipRepository.findByOrganizationIdAndUserId(invitation.getOrganization().getId(), user.getId())
                .orElseGet(() -> organizationMembershipRepository.save(new OrganizationMembership(
                        invitation.getOrganization(),
                        user,
                        invitation.getRole(),
                        MembershipStatus.ACTIVE)));
        if (invitation.getTeam() != null) {
            teamMembershipRepository.findByTeamIdAndUserId(invitation.getTeam().getId(), user.getId())
                    .orElseGet(() -> teamMembershipRepository.save(new TeamMembership(
                            invitation.getTeam(),
                            user,
                            mapRole(invitation.getRole()),
                            MembershipStatus.ACTIVE)));
        }
        user.setCurrentOrganization(invitation.getOrganization());
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);
        return InvitationDto.from(invitation);
    }

    @Override
    public void declineInvitation(Long userId, String token) {
        userLookupService.requireById(userId);
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new InvitationNotFoundException(token));
        invitation.setStatus(InvitationStatus.REVOKED);
        invitationRepository.save(invitation);
    }

    @Override
    public List<InvitationDto> listPendingForUser(Long userId) {
        User user = userLookupService.requireById(userId);
        return invitationRepository.findByEmailAndStatusOrderByCreatedAtDesc(user.getEmail().toLowerCase(), InvitationStatus.PENDING)
                .stream()
                .filter(inv -> inv.getExpiresAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC)))
                .map(InvitationDto::from)
                .toList();
    }

    private TeamRole mapRole(OrganizationRole role) {
        return switch (role) {
            case OWNER, ADMIN -> TeamRole.TEAM_ADMIN;
            case MEMBER -> TeamRole.TEAM_MEMBER;
            case VIEWER -> TeamRole.TEAM_VIEWER;
        };
    }
}
