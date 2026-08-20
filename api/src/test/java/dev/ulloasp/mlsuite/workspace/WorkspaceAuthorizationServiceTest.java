package dev.ulloasp.mlsuite.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.LegacyRolePermissionMapper;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class WorkspaceAuthorizationServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    @Mock
    private RoleSeedService roleSeedService;

    private WorkspaceAuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new WorkspaceAuthorizationService(
                workspaceAccessService,
                roleDefinitionRepository,
                roleSeedService,
                new LegacyRolePermissionMapper());
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
    void workspacePermissions_DenyMemberAdministrativeActions() {
        when(workspaceAccessService.isSuperadmin(3L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(3L, 41L))
                .thenReturn(organizationMembership(OrganizationRole.MEMBER, 3L));

        var permissions = service.workspacePermissions(3L, 41L);

        assertTrue(permissions.canViewModels());
        assertTrue(permissions.canCreateModels());
        assertFalse(permissions.canExportPredictions());
        assertFalse(permissions.canViewMembers());
        assertFalse(permissions.canManageInvitations());
        assertFalse(permissions.canManagePlugins());
    }

    @Test
    void workspacePermissions_GiveOwnerFullOrganizationAccess() {
        when(workspaceAccessService.isSuperadmin(2L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(2L, 41L))
                .thenReturn(organizationMembership(OrganizationRole.OWNER, 2L));

        var permissions = service.workspacePermissions(2L, 41L);

        assertTrue(permissions.canDeleteOrganization());
        assertTrue(permissions.canTransferOwnership());
        assertTrue(permissions.canExportPredictions());
        assertTrue(permissions.canManageReviews());
        assertTrue(permissions.canManagePlugins());
    }

    @Test
    void workspacePermissions_LimitAdminOwnerOnlyActions() {
        when(workspaceAccessService.isSuperadmin(4L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(4L, 41L))
                .thenReturn(organizationMembership(OrganizationRole.ADMIN, 4L));

        var permissions = service.workspacePermissions(4L, 41L);

        assertTrue(permissions.canManageMemberRoles());
        assertTrue(permissions.canExportPredictions());
        assertTrue(permissions.canManageReviews());
        assertTrue(permissions.canManagePlugins());
        assertFalse(permissions.canDeleteOrganization());
        assertFalse(permissions.canTransferOwnership());
    }

    @Test
    void workspacePermissions_KeepViewerReadOnly() {
        when(workspaceAccessService.isSuperadmin(6L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(6L, 41L))
                .thenReturn(organizationMembership(OrganizationRole.VIEWER, 6L));

        var permissions = service.workspacePermissions(6L, 41L);

        assertTrue(permissions.canViewModels());
        assertTrue(permissions.canViewPlugins());
        assertFalse(permissions.canCreateModels());
        assertFalse(permissions.canExportPredictions());
        assertFalse(permissions.canManageReviews());
        assertFalse(permissions.canManagePlugins());
    }

    @Test
    void reviewManagementCheck_ReturnsFalseForUsersOutsideOrganization() {
        when(workspaceAccessService.isSuperadmin(17L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(17L, 41L))
                .thenThrow(new OrganizationAccessDeniedException(41L));

        assertFalse(service.canManageReviews(17L, 41L));
    }

    @Test
    void reviewAccess_UsesRolePermissionsNotSystemRole() {
        RoleDefinition role = roleDefinition(21L, "Custom Reviewer", null);
        role.setPermissions(Set.of(PermissionKey.REVIEW));
        OrganizationMembership membership = organizationMembership(OrganizationRole.VIEWER, 18L);
        membership.setRoleDefinition(role);
        when(workspaceAccessService.isSuperadmin(18L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(18L, 41L)).thenReturn(membership);

        service.requireReviewAccess(18L, 41L);
    }

    @Test
    void requireInvitationManagement_ThrowsForViewer() {
        when(workspaceAccessService.isSuperadmin(5L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(5L, 41L))
                .thenReturn(organizationMembership(OrganizationRole.VIEWER, 5L));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.requireInvitationManagement(5L, 41L));
    }

    @Test
    void organizationMemberActions_LimitAdminAgainstOwner() {
        when(workspaceAccessService.isSuperadmin(9L)).thenReturn(false);
        when(workspaceAccessService.requireMembership(9L, 41L))
                .thenReturn(organizationMembership(OrganizationRole.ADMIN, 9L));
        when(roleDefinitionRepository.findByOrganizationIdAndScopeOrderByLockedDescNameAsc(41L, RoleScope.ORGANIZATION))
                .thenReturn(java.util.List.of(
                        roleDefinition(1L, "Admin", "ADMIN"),
                        roleDefinition(2L, "Member", "MEMBER"),
                        roleDefinition(3L, "Viewer", "VIEWER")));

        MembershipActionsDto ownerActions = service.organizationMemberActions(9L, 41L, organizationMembership(OrganizationRole.OWNER, 10L));
        MembershipActionsDto memberActions = service.organizationMemberActions(9L, 41L, organizationMembership(OrganizationRole.MEMBER, 11L));

        assertFalse(ownerActions.canChangeRole());
        assertFalse(ownerActions.canRemove());
        assertTrue(memberActions.canChangeRole());
        assertTrue(memberActions.canRemove());
        assertEquals(3, memberActions.assignableRoles().size());
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        return user;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setSlug("org");
        organization.setName("Org");
        return organization;
    }

    private OrganizationMembership organizationMembership(OrganizationRole role, Long userId) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization());
        membership.setUser(user(userId));
        membership.setRole(role);
        membership.setStatus(MembershipStatus.ACTIVE);
        return membership;
    }

    private RoleDefinition roleDefinition(Long id, String name, String systemKey) {
        RoleDefinition role = new RoleDefinition(organization(), RoleScope.ORGANIZATION, name, name.toLowerCase(), systemKey);
        role.setId(id);
        return role;
    }
}
