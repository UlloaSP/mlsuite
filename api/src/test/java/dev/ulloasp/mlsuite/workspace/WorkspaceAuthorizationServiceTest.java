package dev.ulloasp.mlsuite.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
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
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;
import dev.ulloasp.mlsuite.team.domain.model.TeamRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class WorkspaceAuthorizationServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private OrganizationMembershipRepository organizationMembershipRepository;

    @Mock
    private TeamMembershipRepository teamMembershipRepository;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    @Mock
    private RoleSeedService roleSeedService;

    private WorkspaceAuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new WorkspaceAuthorizationService(
                workspaceAccessService,
                organizationMembershipRepository,
                teamMembershipRepository,
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
        assertTrue(permissions.canManagePlugins());
    }

    @Test
    void workspacePermissions_DenyMemberAdministrativeActions() {
        when(workspaceAccessService.requireUser(3L)).thenReturn(user(3L));
        when(workspaceAccessService.isSuperadmin(3L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 3L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.MEMBER, 3L)));

        var permissions = service.workspacePermissions(3L, 41L);

        assertTrue(permissions.canViewModels());
        assertTrue(permissions.canCreateModels());
        assertFalse(permissions.canViewMembers());
        assertFalse(permissions.canManageInvitations());
        assertFalse(permissions.canManagePlugins());
    }

    @Test
    void workspacePermissions_GiveOwnerFullOrganizationAccess() {
        when(workspaceAccessService.requireUser(2L)).thenReturn(user(2L));
        when(workspaceAccessService.isSuperadmin(2L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 2L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.OWNER, 2L)));

        var permissions = service.workspacePermissions(2L, 41L);

        assertTrue(permissions.canDeleteOrganization());
        assertTrue(permissions.canTransferOwnership());
        assertTrue(permissions.canManageReviewLinks());
        assertTrue(permissions.canManagePlugins());
    }

    @Test
    void workspacePermissions_LimitAdminOwnerOnlyActions() {
        when(workspaceAccessService.requireUser(4L)).thenReturn(user(4L));
        when(workspaceAccessService.isSuperadmin(4L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 4L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.ADMIN, 4L)));

        var permissions = service.workspacePermissions(4L, 41L);

        assertTrue(permissions.canManageMemberRoles());
        assertTrue(permissions.canManageReviewLinks());
        assertTrue(permissions.canManagePlugins());
        assertFalse(permissions.canDeleteOrganization());
        assertFalse(permissions.canTransferOwnership());
    }

    @Test
    void workspacePermissions_KeepViewerReadOnly() {
        when(workspaceAccessService.requireUser(6L)).thenReturn(user(6L));
        when(workspaceAccessService.isSuperadmin(6L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 6L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.VIEWER, 6L)));

        var permissions = service.workspacePermissions(6L, 41L);

        assertTrue(permissions.canViewModels());
        assertTrue(permissions.canViewPlugins());
        assertFalse(permissions.canCreateModels());
        assertFalse(permissions.canManageReviewLinks());
        assertFalse(permissions.canManagePlugins());
    }

    @Test
    void reviewLinkChecks_ReturnFalseForUsersOutsideOrganization() {
        when(workspaceAccessService.requireUser(17L)).thenReturn(user(17L));
        when(workspaceAccessService.isSuperadmin(17L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 17L))
                .thenReturn(Optional.empty());

        assertFalse(service.canPreviewReviewLink(17L, 41L));
        assertFalse(service.isExternalReviewer(17L, 41L));
    }

    @Test
    void externalReviewCheck_UsesRolePermissionsNotSystemRole() {
        RoleDefinition role = roleDefinition(21L, "Custom Reviewer", null);
        role.setPermissions(Set.of(PermissionKey.EXTERNAL_REVIEW));
        OrganizationMembership membership = organizationMembership(OrganizationRole.VIEWER, 18L);
        membership.setRoleDefinition(role);
        when(workspaceAccessService.requireUser(18L)).thenReturn(user(18L));
        when(workspaceAccessService.isSuperadmin(18L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 18L))
                .thenReturn(Optional.of(membership));

        assertTrue(service.isExternalReviewer(18L, 41L));
    }

    @Test
    void requireInvitationManagement_ThrowsForViewer() {
        when(workspaceAccessService.requireUser(5L)).thenReturn(user(5L));
        when(workspaceAccessService.isSuperadmin(5L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 5L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.VIEWER, 5L)));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.requireInvitationManagement(5L, 41L));
    }

    @Test
    void organizationMemberActions_LimitAdminAgainstOwner() {
        when(workspaceAccessService.requireUser(9L)).thenReturn(user(9L));
        when(workspaceAccessService.isSuperadmin(9L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 9L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.ADMIN, 9L)));
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

    @Test
    void teamPermissions_AllowTeamAdminOnlyInsideTeam() {
        Team team = team(77L);
        when(workspaceAccessService.requireUser(12L)).thenReturn(user(12L));
        when(workspaceAccessService.isSuperadmin(12L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 12L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.VIEWER, 12L)));
        when(teamMembershipRepository.findByTeamIdAndUserId(77L, 12L))
                .thenReturn(Optional.of(teamMembership(team, TeamRole.TEAM_ADMIN, 12L)));

        var permissions = service.teamPermissions(12L, team);

        assertTrue(permissions.canViewTeam());
        assertTrue(permissions.canEditTeam());
        assertFalse(permissions.canDeleteTeam());
        assertTrue(permissions.canManageTeamMemberRoles());
    }

    @Test
    void teamMemberActions_DenyTeamMemberRoleManagement() {
        Team team = team(77L);
        when(workspaceAccessService.requireUser(13L)).thenReturn(user(13L));
        when(workspaceAccessService.isSuperadmin(13L)).thenReturn(false);
        when(organizationMembershipRepository.findByOrganizationIdAndUserId(41L, 13L))
                .thenReturn(Optional.of(organizationMembership(OrganizationRole.MEMBER, 13L)));
        when(teamMembershipRepository.findByTeamIdAndUserId(77L, 13L))
                .thenReturn(Optional.of(teamMembership(team, TeamRole.TEAM_MEMBER, 13L)));

        MembershipActionsDto actions = service.teamMemberActions(13L, team, teamMembership(team, TeamRole.TEAM_VIEWER, 14L));

        assertFalse(actions.canChangeRole());
        assertFalse(actions.canRemove());
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

    private Team team(Long id) {
        Team team = new Team();
        team.setId(id);
        team.setName("Team");
        team.setSlug("team");
        team.setOrganization(organization());
        return team;
    }

    private OrganizationMembership organizationMembership(OrganizationRole role, Long userId) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization());
        membership.setUser(user(userId));
        membership.setRole(role);
        membership.setStatus(MembershipStatus.ACTIVE);
        return membership;
    }

    private TeamMembership teamMembership(Team team, TeamRole role, Long userId) {
        TeamMembership membership = new TeamMembership();
        membership.setTeam(team);
        membership.setUser(user(userId));
        membership.setRole(role);
        membership.setStatus(MembershipStatus.ACTIVE);
        return membership;
    }

    private RoleDefinition roleDefinition(Long id, String name, String systemKey) {
        RoleDefinition role = new RoleDefinition(organization(), null, RoleScope.ORGANIZATION, name, name.toLowerCase(), systemKey);
        role.setId(id);
        return role;
    }
}
