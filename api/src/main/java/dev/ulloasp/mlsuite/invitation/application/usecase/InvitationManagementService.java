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
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
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
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class InvitationManagementService implements InvitationManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final InvitationRepository invitationRepository;
    private final TeamRepository teamRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final UserLookupService userLookupService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final AuditLogService auditLogService;
    private final RoleSeedService roleSeedService;

    public InvitationManagementService(
            WorkspaceAccessService workspaceAccessService,
            InvitationRepository invitationRepository,
            TeamRepository teamRepository,
            OrganizationMembershipRepository organizationMembershipRepository,
            TeamMembershipRepository teamMembershipRepository,
            UserLookupService userLookupService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            AuditLogService auditLogService,
            RoleSeedService roleSeedService) {
        this.workspaceAccessService = workspaceAccessService;
        this.invitationRepository = invitationRepository;
        this.teamRepository = teamRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.teamMembershipRepository = teamMembershipRepository;
        this.userLookupService = userLookupService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.auditLogService = auditLogService;
        this.roleSeedService = roleSeedService;
    }

    @Override
    public List<InvitationDto> listInvitations(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        return invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                .map(InvitationDto::from)
                .toList();
    }

    @Override
    public InvitationDto createInvitation(Long userId, Long organizationId, CreateInvitationRequest request) {
        User user = workspaceAccessService.requireUser(userId);
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        var organization = workspaceAccessService.requireMembership(userId, organizationId).getOrganization();
        String nextRole = request.role().trim().toUpperCase();
        if (!workspaceAuthorizationService.workspacePermissions(userId, organizationId).canTransferOwnership() && "OWNER".equals(nextRole)) {
            throw new IllegalArgumentException("Only owners can transfer ownership.");
        }
        Team team = request.teamId() != null ? teamRepository.findById(request.teamId())
                .filter(candidate -> candidate.getOrganization().getId().equals(organizationId))
                .orElseThrow(() -> new IllegalArgumentException("Team does not belong to organization."))
                : null;
        Invitation invitation = new Invitation(
                organization,
                team,
                request.email().strip().toLowerCase(),
                OrganizationRole.valueOf(nextRole),
                UUID.randomUUID().toString(),
                user,
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
        Invitation saved = invitationRepository.save(invitation);
        auditLogService.record(organization, user, "INVITATION_CREATE", "INVITATION", saved.getId().toString(), saved.getEmail());
        return InvitationDto.from(saved);
    }

    @Override
    public InvitationDto resendInvitation(Long userId, Long organizationId, Long invitationId) {
        User user = workspaceAccessService.requireUser(userId);
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        Invitation invitation = requireOrganizationInvitation(organizationId, invitationId);
        if (invitation.getStatus() == InvitationStatus.ACCEPTED) {
            throw new IllegalArgumentException("Accepted invitation cannot be resent.");
        }
        invitation.setToken(UUID.randomUUID().toString());
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
        Invitation saved = invitationRepository.save(invitation);
        auditLogService.record(saved.getOrganization(), user, "INVITATION_RESEND", "INVITATION", saved.getId().toString(), saved.getEmail());
        return InvitationDto.from(saved);
    }

    @Override
    public void revokeInvitation(Long userId, Long organizationId, Long invitationId) {
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new InvitationNotFoundException(invitationId.toString()));
        if (!invitation.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Invitation does not belong to organization.");
        }
        invitation.setStatus(InvitationStatus.REVOKED);
        invitationRepository.save(invitation);
        auditLogService.record(
                invitation.getOrganization(),
                workspaceAccessService.requireUser(userId),
                "INVITATION_REVOKE",
                "INVITATION",
                invitation.getId().toString(),
                invitation.getEmail());
    }

    @Override
    public void bulkRevokeInvitations(Long userId, Long organizationId, List<Long> invitationIds) {
        for (Long invitationId : invitationIds) {
            revokeInvitation(userId, organizationId, invitationId);
        }
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

        roleSeedService.ensureOrganizationRoles(invitation.getOrganization());
        organizationMembershipRepository.findByOrganizationIdAndUserId(invitation.getOrganization().getId(), user.getId())
                .orElseGet(() -> {
                    OrganizationMembership membership = new OrganizationMembership(invitation.getOrganization(), user, invitation.getRole(), MembershipStatus.ACTIVE);
                    membership.setRoleDefinition(roleSeedService.orgRole(invitation.getOrganization(), invitation.getRole()));
                    return organizationMembershipRepository.save(membership);
                });
        if (invitation.getTeam() != null) {
            roleSeedService.ensureTeamRoles(invitation.getTeam());
            teamMembershipRepository.findByTeamIdAndUserId(invitation.getTeam().getId(), user.getId())
                    .orElseGet(() -> {
                        TeamRole role = mapRole(invitation.getRole());
                        TeamMembership membership = new TeamMembership(invitation.getTeam(), user, role, MembershipStatus.ACTIVE);
                        membership.setRoleDefinition(roleSeedService.teamRole(invitation.getTeam(), role));
                        return teamMembershipRepository.save(membership);
                    });
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

    private Invitation requireOrganizationInvitation(Long organizationId, Long invitationId) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new InvitationNotFoundException(invitationId.toString()));
        if (!invitation.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Invitation does not belong to organization.");
        }
        return invitation;
    }
}
