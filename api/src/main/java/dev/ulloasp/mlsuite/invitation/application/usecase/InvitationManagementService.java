package dev.ulloasp.mlsuite.invitation.application.usecase;

import dev.ulloasp.mlsuite.principal.application.service.Principals;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
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
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationTargetType;
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
    private final NotificationService notificationService;
    private final Principals principals;

    @Override
    public List<InvitationDto> listInvitations(Long userId, Long organizationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.VIEW_INVITATIONS);
        return invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                .map(InvitationDto::from)
                .toList();
    }

    @Override
    public List<InvitationCandidateDto> listInvitationCandidates(Long userId, Long organizationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.INVITE_MEMBERS);
        organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId))
                .requireTeam(InvitationCatalogService.NO_INVITATIONS);
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
        organization.requireTeam(InvitationCatalogService.NO_INVITATIONS);
        RoleDefinition roleDefinition = resolveRoleDefinition(organization, request);
        String email = request.email().strip().toLowerCase();
        if (organizationMembershipRepository.existsActiveByOrganizationIdAndEmail(organizationId, email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, email + " is already a member of this organization.");
        }
        if (OrganizationRole.OWNER.name().equals(roleDefinition.getSystemKey())
                && !workspaceAuthorizationService.has(userId, organizationId, PermissionKey.TRANSFER_OWNERSHIP)) {
            throw new IllegalArgumentException("Only owners can transfer ownership.");
        }
        Invitation invitation = new Invitation(
                organization,
                email,
                roleDefinition,
                principals.of(user),
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
        Invitation saved = invitationRepository.save(invitation);
        if (user.getSystemRole() == SystemRole.SUPERADMIN) {
            User invitee = userRepository.findByEmailIgnoreCase(saved.getEmail())
                    .orElseThrow(() -> new IllegalArgumentException("Invited user does not exist."));
            acceptPendingInvitation(saved, invitee, principals.of(user));
            if (!invitee.getId().equals(userId)) {
                notificationService.notify(invitee.getId(), organizationId, NotificationKind.ORGANIZATION_JOINED,
                        organizationId.toString(), invited(saved));
            }
        } else {
            notifyInvitee(saved);
        }
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.INVITATION_CREATE, saved.getId(),
                AuditDetails.of("email", saved.getEmail(), "role", roleDefinition.getName()));
        return InvitationDto.from(saved);
    }

    @Override
    public InvitationDto resendInvitation(Long userId, Long organizationId, Long invitationId) {
        User user = workspaceAccessService.requireUser(userId);
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.MANAGE_INVITATIONS);
        Invitation invitation = requireOrganizationInvitation(organizationId, invitationId);
        // A revoked, declined or accepted invitation is closed: a new one is sent instead.
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only a pending or expired invitation can be resent; send a new invitation instead.");
        }
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setUpdatedBy(principals.of(user));
        invitation.setExpiresAt(OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
        Invitation saved = invitationRepository.save(invitation);
        notifyInvitee(saved);
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.INVITATION_RESEND, saved.getId(),
                AuditDetails.of("email", saved.getEmail()));
        return InvitationDto.from(saved);
    }

    @Override
    public void revokeInvitation(Long userId, Long organizationId, Long invitationId) {
        workspaceAuthorizationService.require(userId, organizationId, PermissionKey.MANAGE_INVITATIONS);
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new InvitationNotFoundException(invitationId));
        if (!invitation.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Invitation does not belong to organization.");
        }
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This invitation was already " + invitation.getStatus().name().toLowerCase() + ".");
        }
        invitation.setStatus(InvitationStatus.REVOKED);
        invitation.setUpdatedBy(principals.user(userId));
        invitationRepository.save(invitation);
        // The invitee is no longer invited: what told them so is taken back.
        notificationService.withdraw(NotificationKind.INVITATION_RECEIVED, invitationId.toString());
        auditLogService.record(AuditActor.user(userId), organizationId, AuditAction.INVITATION_REVOKE, invitationId,
                AuditDetails.of("email", invitation.getEmail()));
    }

    @Override
    public void bulkRevokeInvitations(Long userId, Long organizationId, List<Long> invitationIds) {
        for (Long invitationId : invitationIds) {
            revokeInvitation(userId, organizationId, invitationId);
        }
    }

    @Override
    public InvitationDto acceptInvitation(Long userId, Long invitationId) {
        User user = userLookupService.requireById(userId);
        Invitation invitation = requireOwnPendingInvitation(user, invitationId);
        acceptPendingInvitation(invitation, user, principals.of(user));
        auditLogService.record(AuditActor.user(userId), invitation.getOrganization().getId(),
                AuditAction.INVITATION_ACCEPT, invitationId, AuditDetails.of("role", invitation.getRoleDefinition().getName()));
        notifyAnswered(invitation, user, NotificationKind.INVITATION_ACCEPTED);
        return InvitationDto.from(invitation);
    }

    @Override
    public void declineInvitation(Long userId, Long invitationId) {
        User user = userLookupService.requireById(userId);
        Invitation invitation = requireOwnPendingInvitation(user, invitationId);
        invitation.setStatus(InvitationStatus.DECLINED);
        invitation.setUpdatedBy(principals.of(user));
        invitationRepository.save(invitation);
        auditLogService.record(AuditActor.user(userId), invitation.getOrganization().getId(),
                AuditAction.INVITATION_DECLINE, invitationId);
        notifyAnswered(invitation, user, NotificationKind.INVITATION_DECLINED);
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

    /**
     * Only the account with the invited email may answer an invitation, and only while it is
     * pending and unexpired. Anyone else's invitation does not exist for them, so its id reveals
     * nothing.
     */
    private Invitation requireOwnPendingInvitation(User user, Long invitationId) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .filter(found -> user.getEmail().equalsIgnoreCase(found.getEmail()))
                .orElseThrow(() -> new InvitationNotFoundException(invitationId));
        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalArgumentException("Invitation is not pending.");
        }
        if (invitation.statusAt(OffsetDateTime.now(ZoneOffset.UTC)) == InvitationStatus.EXPIRED) {
            throw new IllegalArgumentException("Invitation expired.");
        }
        return invitation;
    }

    /**
     * Makes the invitee a member. {@code by} is who did it: the invitee accepting, or the superadmin
     * who added them directly.
     */
    private void acceptPendingInvitation(Invitation invitation, User user, Principal by) {
        RoleDefinition roleDefinition = invitation.getRoleDefinition();
        var existingMembership = organizationMembershipRepository
                .findByOrganizationIdAndUserId(invitation.getOrganization().getId(), user.getId());
        OrganizationMembership membership = existingMembership.orElseGet(() -> new OrganizationMembership(
                invitation.getOrganization(), user, roleDefinition, MembershipStatus.ACTIVE, by));
        if (existingMembership.isEmpty() || membership.getStatus() != MembershipStatus.ACTIVE) {
            membership.setStatus(MembershipStatus.ACTIVE);
            membership.setUpdatedBy(by);
            membership.setRoleDefinition(roleDefinition);
            organizationMembershipRepository.save(membership);
        }
        user.setCurrentOrganization(invitation.getOrganization());
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setUpdatedBy(by);
        invitationRepository.save(invitation);
    }

    /** Invitations go to existing accounts; an address without one finds it once it has an account. */
    private void notifyInvitee(Invitation invitation) {
        userRepository.findByEmailIgnoreCase(invitation.getEmail())
                .ifPresent(invitee -> notificationService.notify(invitee.getId(), invitation.getOrganization().getId(),
                        NotificationKind.INVITATION_RECEIVED, invitation.getId().toString(), invited(invitation)));
    }

    private void notifyAnswered(Invitation invitation, User invitee, NotificationKind answer) {
        String id = invitation.getId().toString();
        notificationService.markTargetRead(invitee.getId(), NotificationTargetType.INVITATION, id);
        Long inviter = invitation.getCreatedBy().userId();
        if (inviter == null) return;
        notificationService.notify(inviter, invitation.getOrganization().getId(), answer, id,
                Map.of("organizationName", invitation.getOrganization().getName(),
                        "inviteeName", invitee.getFullName()));
    }

    private static Map<String, Object> invited(Invitation invitation) {
        return Map.of("organizationName", invitation.getOrganization().getName(),
                "inviterName", invitation.getCreatedBy().label(),
                "roleName", invitation.getRoleDefinition().getName());
    }

    private RoleDefinition resolveRoleDefinition(Organization organization, CreateInvitationRequest request) {
        return roleDefinitionRepository.findByIdAndOrganizationId(request.roleDefinitionId(), organization.getId())
                .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
    }

    private Invitation requireOrganizationInvitation(Long organizationId, Long invitationId) {
        Invitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new InvitationNotFoundException(invitationId));
        if (!invitation.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Invitation does not belong to organization.");
        }
        return invitation;
    }
}
