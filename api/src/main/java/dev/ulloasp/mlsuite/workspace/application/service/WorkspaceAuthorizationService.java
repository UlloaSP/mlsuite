package dev.ulloasp.mlsuite.workspace.application.service;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkspaceAuthorizationService {

    private final WorkspaceAccessService workspaceAccessService;
    private final RoleDefinitionRepository roleDefinitionRepository;

    public WorkspacePermissionsDto workspacePermissions(Long userId, Long organizationId) {
        return WorkspacePermissionsDto.from(effectiveOrganizationPermissions(userId, organizationId));
    }

    public Set<PermissionKey> effectiveOrganizationPermissions(Long userId, Long organizationId) {
        if (workspaceAccessService.isSuperadmin(userId)) {
            return EnumSet.allOf(PermissionKey.class);
        }
        return workspaceAccessService.requireMembership(userId, organizationId).getRoleDefinition().getPermissions();
    }

    /** Requires at least one of {@code anyOf} in the organization. */
    public void require(Long userId, Long organizationId, PermissionKey... anyOf) {
        Set<PermissionKey> granted = effectiveOrganizationPermissions(userId, organizationId);
        if (Arrays.stream(anyOf).noneMatch(granted::contains)) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
    }

    /** Resolves the user's current organization and requires at least one of {@code anyOf} in it. */
    public Organization requireCurrent(Long userId, PermissionKey... anyOf) {
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        require(userId, organization.getId(), anyOf);
        return organization;
    }

    /** Like {@link #require} but answers false instead of throwing, including for non-members. */
    public boolean has(Long userId, Long organizationId, PermissionKey permission) {
        try {
            return effectiveOrganizationPermissions(userId, organizationId).contains(permission);
        } catch (OrganizationAccessDeniedException ex) {
            return false;
        }
    }

    public MembershipActionsDto organizationMemberActions(Long actorUserId, Long organizationId, OrganizationMembership target) {
        WorkspacePermissionsDto workspace = workspacePermissions(actorUserId, organizationId);
        MembershipActionsDto flags = organizationMemberActionFlags(actorUserId, workspace, target);
        if (!flags.canChangeRole()) {
            return flags;
        }
        var roles = roleDefinitionRepository.findByOrganizationIdAndScopeOrderByLockedDescNameAsc(organizationId, RoleScope.ORGANIZATION)
                .stream()
                .filter(role -> !OrganizationRole.OWNER.name().equals(role.getSystemKey()))
                .map(RoleSummaryDto::from)
                .toList();
        return new MembershipActionsDto(true, flags.canRemove(), roles);
    }

    /** What the actor may do to the member, without the roles to choose from: a catalog pages those apart. */
    public MembershipActionsDto organizationMemberActionFlags(Long actorUserId, WorkspacePermissionsDto workspace,
            OrganizationMembership target) {
        if (!workspace.canViewMembers() || !workspace.canManageMemberRoles()
                || actorUserId.equals(target.getUser().getId()) || target.isOwner()) {
            return new MembershipActionsDto(false, false, List.of());
        }
        return new MembershipActionsDto(true, workspace.canRemoveMembers(), List.of());
    }
}
