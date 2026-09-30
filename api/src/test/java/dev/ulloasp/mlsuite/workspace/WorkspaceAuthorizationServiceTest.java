package dev.ulloasp.mlsuite.workspace;

import static dev.ulloasp.mlsuite.support.TestFixtures.membership;
import static dev.ulloasp.mlsuite.support.TestFixtures.organization;
import static dev.ulloasp.mlsuite.support.TestFixtures.role;
import static dev.ulloasp.mlsuite.support.TestFixtures.user;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class WorkspaceAuthorizationServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    private WorkspaceAuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new WorkspaceAuthorizationService(workspaceAccessService, roleDefinitionRepository);
    }

    @Test
    void workspacePermissions_GiveSuperadminFullAccess() {
        when(workspaceAccessService.isSuperadmin(7L)).thenReturn(true);

        var permissions = service.workspacePermissions(7L, 41L);

        assertTrue(permissions.canDeleteOrganization());
        assertTrue(permissions.canManageInvitations());
        assertTrue(permissions.canExportPredictions());
        assertTrue(permissions.canManagePlugins());
    }

    @Test
    void workspacePermissions_ReflectTheMembershipRoleDefinition() {
        memberWith(3L, PermissionKey.VIEW_MODELS, PermissionKey.CREATE_MODELS);

        var permissions = service.workspacePermissions(3L, 41L);

        assertTrue(permissions.canViewModels());
        assertTrue(permissions.canCreateModels());
        assertFalse(permissions.canExportPredictions());
        assertFalse(permissions.canViewMembers());
        assertFalse(permissions.canManagePlugins());
    }

    @Test
    void require_PassesWhenAnyListedPermissionIsGranted() {
        memberWith(18L, PermissionKey.REVIEW);

        service.require(18L, 41L, PermissionKey.REVIEW, PermissionKey.MANAGE_REVIEWS);
    }

    @Test
    void require_ThrowsWhenNoListedPermissionIsGranted() {
        memberWith(5L, PermissionKey.VIEW_MODELS);

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.require(5L, 41L, PermissionKey.MANAGE_INVITATIONS));
    }

    @Test
    void require_ThrowsForUsersOutsideOrganization() {
        when(workspaceAccessService.isSuperadmin(17L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(17L, 41L)).thenThrow(new OrganizationAccessDeniedException(41L));

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.require(17L, 41L, PermissionKey.VIEW_MODELS));
    }

    @Test
    void requireCurrent_ReturnsCurrentOrganizationWhenGranted() {
        Organization organization = organization();
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization);
        memberWith(3L, PermissionKey.RUN_PREDICTIONS);

        assertSame(organization, service.requireCurrent(3L, PermissionKey.RUN_PREDICTIONS));
    }

    @Test
    void requireCurrent_ThrowsWhenCurrentOrganizationDeniesPermission() {
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
        memberWith(3L, PermissionKey.VIEW_MODELS);

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.requireCurrent(3L, PermissionKey.RUN_PREDICTIONS));
    }

    @Test
    void has_ReturnsFalseForUsersOutsideOrganization() {
        when(workspaceAccessService.isSuperadmin(17L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(17L, 41L)).thenThrow(new OrganizationAccessDeniedException(41L));

        assertFalse(service.has(17L, 41L, PermissionKey.MANAGE_REVIEWS));
    }

    @Test
    void organizationMemberActions_LimitAdminAgainstOwner() {
        memberWith(9L, PermissionKey.VIEW_MEMBERS, PermissionKey.MANAGE_MEMBER_ROLES, PermissionKey.REMOVE_MEMBERS);
        Organization organization = organization();
        when(roleDefinitionRepository.findByOrganizationIdAndScopeOrderByLockedDescNameAsc(41L, RoleScope.ORGANIZATION))
                .thenReturn(List.of(role(organization, "OWNER"), role(organization, "ADMIN"),
                        role(organization, "MEMBER"), role(organization, "VIEWER")));

        MembershipActionsDto ownerActions = service.organizationMemberActions(9L, 41L,
                membership(organization, user(10L), role(organization, "OWNER")));
        MembershipActionsDto memberActions = service.organizationMemberActions(9L, 41L,
                membership(organization, user(11L), role(organization, "MEMBER")));

        assertFalse(ownerActions.canChangeRole());
        assertFalse(ownerActions.canRemove());
        assertTrue(memberActions.canChangeRole());
        assertTrue(memberActions.canRemove());
        assertEquals(3, memberActions.assignableRoles().size());
    }

    private void memberWith(Long userId, PermissionKey... permissions) {
        Organization organization = organization();
        OrganizationMembership membership = membership(organization, user(userId), role(organization, null, permissions));
        when(workspaceAccessService.isSuperadmin(userId)).thenReturn(false);
        when(workspaceAccessService.requireMembership(userId, 41L)).thenReturn(membership);
    }
}
