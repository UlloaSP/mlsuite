package dev.ulloasp.mlsuite.invitation.application.usecase;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.dto.CreateInvitationRequest;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationCandidateDto;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.invitation.application.port.in.InvitationManagementUseCase;
import dev.ulloasp.mlsuite.invitation.domain.exception.InvitationNotFoundException;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class InvitationManagementService implements InvitationManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final InvitationRepository invitationRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final OrganizationRepository organizationRepository;
    private final UserLookupService userLookupService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final AuditLogService auditLogService;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final UserRepository userRepository;

    @Override
    public List<InvitationDto> listInvitations(Long userId, Long organizationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.VIEW_INVITATIONS);
        boolean includeTokens = workspaceAuthorizationService.has(userId, organizationId, PermissionKey.MANAGE_INVITATIONS);
        return invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                .map(invitation -> InvitationDto.from(invitation, includeTokens))
                .toList();
    }

    @Override
    public List<InvitationCandidateDto> listInvitationCandidates(Long userId, Long organizationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.INVITE_MEMBERS);
        return userRepository.findEnabledUsersOutsideActiveOrganization(organizationId)
                .stream()
                .map(InvitationCandidateDto::from)
                .toList();
    }

    @Override
    public InvitationDto createInvitation(Long userId, Long organizationId, CreateInvitationRequest request) {
        User user = workspaceAccessService.requireUser(userId);
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.INVITE_MEMBERS);
        var organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        RoleDefinition roleDefinition = resolveRoleDefinition(organization, request);
        if (OrganizationRole.OWNER.name().equals(roleDefinition.getSystemKey())
                && !workspaceAuthorizationService.has(userId, organizationId, PermissionKey.TRANSFER_OWNERSHIP)) {
            throw new IllegalArgumentException("Only owners can transfer ownership.");
        }
        Invitation invitation = new Invitation(
                organization,
                request.email().strip().toLowerCase(),
                roleDefinition,
                UUID.randomUUID().toString(),
                user,
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
        Invitation saved = invitationRepository.save(invitation);
        if (user.getSystemRole() == SystemRole.SUPERADMIN) {
            User invitee = userRepository.findByEmailIgnoreCase(saved.getEmail())
                    .orElseThrow(() -> new IllegalArgumentException("Invited user does not exist."));
            acceptPendingInvitation(saved, invitee);
        }
        auditLogService.record(organization, user, "INVITATION_CREATE", "INVITATION", saved.getId().toString(), saved.getEmail());
        return InvitationDto.from(saved);
    }

    @Override
    public InvitationDto resendInvitation(Long userId, Long organizationId, Long invitationId) {
        User user = workspaceAccessService.requireUser(userId);
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.MANAGE_INVITATIONS);
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
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.MANAGE_INVITATIONS);
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

        acceptPendingInvitation(invitation, user);
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

    private void acceptPendingInvitation(Invitation invitation, User user) {
        RoleDefinition roleDefinition = invitation.getRoleDefinition();
        var existingMembership = organizationMembershipRepository
                .findByOrganizationIdAndUserId(invitation.getOrganization().getId(), user.getId());
        OrganizationMembership membership = existingMembership.orElseGet(() -> new OrganizationMembership(
                invitation.getOrganization(), user, roleDefinition, MembershipStatus.ACTIVE));
        if (existingMembership.isEmpty() || membership.getStatus() != MembershipStatus.ACTIVE) {
            membership.setStatus(MembershipStatus.ACTIVE);
            membership.setRoleDefinition(roleDefinition);
            organizationMembershipRepository.save(membership);
        }
        user.setCurrentOrganization(invitation.getOrganization());
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);
    }

    private RoleDefinition resolveRoleDefinition(Organization organization, CreateInvitationRequest request) {
        return roleDefinitionRepository.findByIdAndOrganizationId(request.roleDefinitionId(), organization.getId())
                .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
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
