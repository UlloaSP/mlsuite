package dev.ulloasp.mlsuite.invitation.application.usecase;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.OrganizationSystemRole;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
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

@Service
@Transactional
public class InvitationManagementService implements InvitationManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final InvitationRepository invitationRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final UserLookupService userLookupService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final AuditLogService auditLogService;
    private final RoleSeedService roleSeedService;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final UserRepository userRepository;

    public InvitationManagementService(
            WorkspaceAccessService workspaceAccessService,
            InvitationRepository invitationRepository,
            OrganizationMembershipRepository organizationMembershipRepository,
            UserLookupService userLookupService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            AuditLogService auditLogService,
            RoleSeedService roleSeedService,
            RoleDefinitionRepository roleDefinitionRepository,
            UserRepository userRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.invitationRepository = invitationRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.userLookupService = userLookupService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.auditLogService = auditLogService;
        this.roleSeedService = roleSeedService;
        this.roleDefinitionRepository = roleDefinitionRepository;
        this.userRepository = userRepository;
    }

    @Override
    public List<InvitationDto> listInvitations(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        return invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                .map(InvitationDto::from)
                .toList();
    }

    @Override
    public List<InvitationCandidateDto> listInvitationCandidates(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        return userRepository.findEnabledUsersOutsideActiveOrganization(organizationId)
                .stream()
                .map(InvitationCandidateDto::from)
                .toList();
    }

    @Override
    public InvitationDto createInvitation(Long userId, Long organizationId, CreateInvitationRequest request) {
        User user = workspaceAccessService.requireUser(userId);
        workspaceAuthorizationService.requireInvitationManagement(userId, organizationId);
        var organization = workspaceAccessService.requireMembership(userId, organizationId).getOrganization();
        roleSeedService.ensureOrganizationRoles(organization);
        RoleDefinition roleDefinition = resolveRoleDefinition(organization, request);
        OrganizationRole legacyRole = legacyRole(roleDefinition);
        if (!workspaceAuthorizationService.workspacePermissions(userId, organizationId).canTransferOwnership() && legacyRole == OrganizationRole.OWNER) {
            throw new IllegalArgumentException("Only owners can transfer ownership.");
        }
        Invitation invitation = new Invitation(
                organization,
                request.email().strip().toLowerCase(),
                legacyRole,
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
        roleSeedService.ensureOrganizationRoles(invitation.getOrganization());
        RoleDefinition roleDefinition = invitation.getRoleDefinition() != null
                ? invitation.getRoleDefinition()
                : roleSeedService.orgRole(invitation.getOrganization(), invitation.getRole());
        var existingMembership = organizationMembershipRepository
                .findByOrganizationIdAndUserId(invitation.getOrganization().getId(), user.getId());
        OrganizationMembership membership = existingMembership.orElseGet(() -> new OrganizationMembership(
                invitation.getOrganization(), user, invitation.getRole(), MembershipStatus.ACTIVE));
        if (existingMembership.isEmpty() || membership.getStatus() != MembershipStatus.ACTIVE) {
            membership.setStatus(MembershipStatus.ACTIVE);
            membership.setRole(invitation.getRole());
            membership.setRoleDefinition(roleDefinition);
            organizationMembershipRepository.save(membership);
        }
        user.setCurrentOrganization(invitation.getOrganization());
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);
    }

    private RoleDefinition resolveRoleDefinition(Organization organization, CreateInvitationRequest request) {
        if (request.roleDefinitionId() != null) {
            return roleDefinitionRepository.findByIdAndOrganizationId(request.roleDefinitionId(), organization.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
        }
        if (request.role() == null || request.role().isBlank()) {
            throw new IllegalArgumentException("Role is required.");
        }
        OrganizationRole role = OrganizationRole.valueOf(request.role().trim().toUpperCase());
        return roleSeedService.orgRole(organization, role);
    }

    private OrganizationRole legacyRole(RoleDefinition roleDefinition) {
        return OrganizationSystemRole.legacyRole(roleDefinition, OrganizationRole.MEMBER);
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
