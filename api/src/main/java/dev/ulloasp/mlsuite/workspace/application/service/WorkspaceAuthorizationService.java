package dev.ulloasp.mlsuite.workspace.application.service;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.application.service.LegacyRolePermissionMapper;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

@Service
@Transactional
public class WorkspaceAuthorizationService {

    private final WorkspaceAccessService workspaceAccessService;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final RoleSeedService roleSeedService;
    private final LegacyRolePermissionMapper legacyRolePermissionMapper;

    public WorkspaceAuthorizationService(
            WorkspaceAccessService workspaceAccessService,
            OrganizationMembershipRepository organizationMembershipRepository,
            RoleDefinitionRepository roleDefinitionRepository,
            RoleSeedService roleSeedService,
            LegacyRolePermissionMapper legacyRolePermissionMapper) {
        this.workspaceAccessService = workspaceAccessService;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.roleDefinitionRepository = roleDefinitionRepository;
        this.roleSeedService = roleSeedService;
        this.legacyRolePermissionMapper = legacyRolePermissionMapper;
    }

    public WorkspacePermissionsDto workspacePermissions(Long userId, Long organizationId) {
        if (workspaceAccessService.isSuperadmin(userId)) {
            return new WorkspacePermissionsDto(true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true);
        }
        Set<PermissionKey> permissions = effectiveOrganizationPermissions(userId, organizationId);
        return new WorkspacePermissionsDto(
                has(permissions, PermissionKey.VIEW_WORKSPACE),
                has(permissions, PermissionKey.VIEW_ORGANIZATION),
                has(permissions, PermissionKey.EDIT_ORGANIZATION),
                has(permissions, PermissionKey.DELETE_ORGANIZATION),
                has(permissions, PermissionKey.TRANSFER_OWNERSHIP),
                has(permissions, PermissionKey.VIEW_MEMBERS),
                has(permissions, PermissionKey.INVITE_MEMBERS),
                has(permissions, PermissionKey.MANAGE_MEMBER_ROLES),
                has(permissions, PermissionKey.REMOVE_MEMBERS),
                has(permissions, PermissionKey.VIEW_INVITATIONS),
                has(permissions, PermissionKey.MANAGE_INVITATIONS),
                has(permissions, PermissionKey.VIEW_MODELS),
                has(permissions, PermissionKey.CREATE_MODELS),
                has(permissions, PermissionKey.EDIT_MODELS),
                has(permissions, PermissionKey.DELETE_MODELS),
                has(permissions, PermissionKey.RUN_PREDICTIONS),
                has(permissions, PermissionKey.EXPORT_PREDICTIONS),
                has(permissions, PermissionKey.REVIEW),
                has(permissions, PermissionKey.MANAGE_REVIEWS),
                has(permissions, PermissionKey.VIEW_PLUGINS),
                has(permissions, PermissionKey.MANAGE_PLUGINS));
    }

    public Set<PermissionKey> effectiveOrganizationPermissions(Long userId, Long organizationId) {
        if (workspaceAccessService.isSuperadmin(userId)) {
            return legacyRolePermissionMapper.all();
        }
        User user = workspaceAccessService.requireUser(userId);
        OrganizationMembership membership = requireOrganizationMembership(user, organizationId);
        roleSeedService.ensureOrganizationRoles(membership.getOrganization());
        if (membership.getRoleDefinition() != null) {
            return membership.getRoleDefinition().getPermissions();
        }
        return legacyRolePermissionMapper.organization(membership.getRole());
    }

    public void requireOrganizationRead(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canViewOrganization()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireOrganizationOperate(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canCreateModels()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireRunPredictions(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canRunPredictions()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireOrganizationEdit(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canEditOrganization()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireOrganizationDelete(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canDeleteOrganization()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireOrganizationMemberView(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canViewMembers()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireInvitationManagement(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canManageInvitations()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requirePluginView(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canViewPlugins()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requirePluginManage(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canManagePlugins()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public void requireReviewManagement(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canManageReviews()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public boolean canManageReviews(Long userId, Long organizationId) {
        try {
            return workspacePermissions(userId, organizationId).canManageReviews();
        } catch (OrganizationAccessDeniedException ex) {
            return false;
        }
    }

    public void requireReviewAccess(Long userId, Long organizationId) {
        WorkspacePermissionsDto permissions = workspacePermissions(userId, organizationId);
        if (!permissions.canReview() && !permissions.canManageReviews()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    public MembershipActionsDto organizationMemberActions(Long actorUserId, Long organizationId, OrganizationMembership target) {
        WorkspacePermissionsDto workspace = workspacePermissions(actorUserId, organizationId);
        if (!workspace.canViewMembers() || actorUserId.equals(target.getUser().getId()) || isOwner(target)) {
            return new MembershipActionsDto(false, false, List.of());
        }
        if (!workspace.canManageMemberRoles()) {
            return new MembershipActionsDto(false, false, List.of());
        }
        var roles = roleDefinitionRepository.findByOrganizationIdAndScopeOrderByLockedDescNameAsc(organizationId, RoleScope.ORGANIZATION)
                .stream()
                .filter(role -> !OrganizationRole.OWNER.name().equals(role.getSystemKey()))
                .map(RoleSummaryDto::from)
                .toList();
        return new MembershipActionsDto(true, workspace.canRemoveMembers(), roles);
    }

    public void requireOwnershipTransfer(Long userId, Long organizationId) {
        if (!workspacePermissions(userId, organizationId).canTransferOwnership()) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    private OrganizationMembership requireOrganizationMembership(User user, Long organizationId) {
        return organizationMembershipRepository.findByOrganizationIdAndUserId(organizationId, user.getId())
                .filter(membership -> membership.getStatus() == dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE)
                .orElseThrow(() -> new OrganizationAccessDeniedException(organizationId));
    }

    private boolean has(Set<PermissionKey> permissions, PermissionKey key) {
        return permissions.contains(key);
    }

    private String systemKey(RoleDefinition role) {
        return role == null ? null : role.getSystemKey();
    }

    private boolean isOwner(OrganizationMembership membership) {
        return OrganizationRole.OWNER.name().equals(systemKey(membership.getRoleDefinition()))
                || membership.getRole() == OrganizationRole.OWNER;
    }
}
