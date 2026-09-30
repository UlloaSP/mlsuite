package dev.ulloasp.mlsuite.organization;

import static dev.ulloasp.mlsuite.support.TestFixtures.user;
import static dev.ulloasp.mlsuite.support.TestFixtures.organization;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationDeletionService;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationManagementService;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationStatsService;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminStatsDto;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@ExtendWith(MockitoExtension.class)
class OrganizationManagementServiceTest {

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    @Mock
    private WorkspaceAuthorizationService workspaceAuthorizationService;

    @Mock
    private OrganizationRepository organizationRepository;

    @Mock
    private OrganizationMembershipRepository membershipRepository;

    @Mock
    private OrganizationStatsService organizationStatsService;

    @Mock
    private InvitationRepository invitationRepository;

    @Mock
    private RoleSeedService roleSeedService;

    @Mock
    private RoleDefinitionRepository roleDefinitionRepository;

    @Mock
    private OrganizationDeletionService organizationDeletionService;

    @Mock
    private WorkspacePermissionsDto workspacePermissions;

    private OrganizationManagementService service;

    @BeforeEach
    void setUp() {
        service = new OrganizationManagementService(
                workspaceAccessService,
                workspaceAuthorizationService,
                organizationRepository,
                membershipRepository,
                invitationRepository,
                roleSeedService,
                roleDefinitionRepository,
                organizationDeletionService,
                organizationStatsService);
    }

    @Test
    void createOrganization_AllowsSuperadminToPickOwner() {
        User actor = user(7L);
        actor.setSystemRole(SystemRole.SUPERADMIN);
        User owner = user(8L);
        Organization saved = organization();
        RoleDefinition ownerRole = orgRole(OrganizationRole.OWNER);
        when(workspaceAccessService.requireUser(7L)).thenReturn(actor);
        when(workspaceAccessService.isSuperadmin(7L)).thenReturn(true);
        when(workspaceAccessService.requireUser(8L)).thenReturn(owner);
        when(organizationRepository.save(org.mockito.ArgumentMatchers.any(Organization.class)))
                .thenReturn(saved);
        when(roleSeedService.orgRole(saved, OrganizationRole.OWNER)).thenReturn(ownerRole);

        service.createOrganization(7L, new CreateOrganizationRequest("Acme", "acme", null, 8L));

        ArgumentCaptor<OrganizationMembership> captor = ArgumentCaptor.forClass(OrganizationMembership.class);
        verify(membershipRepository).save(captor.capture());
        assertEquals(owner, captor.getValue().getUser());
        assertEquals(ownerRole, captor.getValue().getRoleDefinition());
    }

    @Test
    void createOrganization_RejectsPickedOwnerWhenActorIsNotSuperadmin() {
        User actor = user(7L);
        when(workspaceAccessService.requireUser(7L)).thenReturn(actor);
        when(workspaceAccessService.isSuperadmin(7L)).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> service.createOrganization(7L, new CreateOrganizationRequest("Acme", "acme", null, 8L)));
    }

    @Test
    void getAdminDashboard_OmitsCollectionsWithoutTheirPermissions() {
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization()));
        when(workspaceAuthorizationService.workspacePermissions(7L, 41L)).thenReturn(workspacePermissions);
        when(organizationStatsService.stats(41L, workspacePermissions))
                .thenReturn(new OrganizationAdminStatsDto(0, 0, 0, 0, 0, 0, 0));

        var result = service.getAdminDashboard(7L, 41L);

        assertEquals(0, result.stats().totalMembers());
        assertEquals(0, result.stats().pendingInvitations());
        assertEquals(List.of(), result.recentMembers());
        assertEquals(List.of(), result.recentInvitations());
        var statsJson = new ObjectMapper().valueToTree(result.stats());
        assertFalse(statsJson.has("quotaUsed"));
        assertFalse(statsJson.has("quotaLimit"));
        verify(membershipRepository, never())
                .findActiveByOrganizationIdOrderByCreatedAtAsc(41L);
        verify(invitationRepository, never()).findByOrganizationIdOrderByCreatedAtDesc(41L);
    }

    @Test
    void getAdminDashboard_LoadsAuthorizedMemberAndInvitationSummaries() {
        when(organizationRepository.findById(41L)).thenReturn(Optional.of(organization()));
        when(workspaceAuthorizationService.workspacePermissions(7L, 41L)).thenReturn(workspacePermissions);
        when(workspacePermissions.canViewMembers()).thenReturn(true);
        when(workspacePermissions.canViewInvitations()).thenReturn(true);

        OrganizationMembership oldest = membership(1L, OrganizationRole.OWNER, MembershipStatus.ACTIVE);
        OrganizationMembership newest = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(membershipRepository.findActiveByOrganizationIdOrderByCreatedAtAsc(41L))
                .thenReturn(List.of(oldest, newest));

        var result = service.getAdminDashboard(7L, 41L);

        assertEquals(List.of(2L, 1L), result.recentMembers().stream().map(row -> row.id()).toList());
        verify(invitationRepository).findByOrganizationIdOrderByCreatedAtDesc(41L);
    }

    @Test
    void transferOwnership_MovesOwnerToTargetActiveMember() {
        OrganizationMembership owner = membership(1L, OrganizationRole.OWNER, MembershipStatus.ACTIVE);
        OrganizationMembership target = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(membershipRepository.findActiveByIdAndOrganizationId(2L, 41L)).thenReturn(Optional.of(target));
        when(membershipRepository.findActiveByOrganizationIdOrderByCreatedAtAsc(41L))
                .thenReturn(List.of(owner, target));
        when(membershipRepository.save(owner)).thenReturn(owner);
        when(membershipRepository.save(target)).thenReturn(target);
        RoleDefinition adminRole = orgRole(OrganizationRole.ADMIN);
        RoleDefinition ownerRole = orgRole(OrganizationRole.OWNER);
        when(roleSeedService.orgRole(target.getOrganization(), OrganizationRole.ADMIN)).thenReturn(adminRole);
        when(roleSeedService.orgRole(target.getOrganization(), OrganizationRole.OWNER)).thenReturn(ownerRole);

        var result = service.transferOwnership(7L, 41L, new TransferOrganizationOwnershipRequest(2L));

        assertEquals(adminRole, owner.getRoleDefinition());
        assertEquals(ownerRole, target.getRoleDefinition());
        assertEquals(2L, result.id());
        verify(workspaceAuthorizationService).require(7L, 41L, PermissionKey.TRANSFER_OWNERSHIP);
    }

    @Test
    void transferOwnership_DeniesActorWithoutTransferPermission() {
        doThrow(new OrganizationAccessDeniedException(41L))
                .when(workspaceAuthorizationService).require(8L, 41L, PermissionKey.TRANSFER_OWNERSHIP);

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.transferOwnership(8L, 41L, new TransferOrganizationOwnershipRequest(2L)));
    }

    @Test
    void transferOwnership_RejectsInactiveTarget() {
        when(membershipRepository.findActiveByIdAndOrganizationId(2L, 41L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.transferOwnership(7L, 41L, new TransferOrganizationOwnershipRequest(2L)));
    }

    @Test
    void transferOwnership_RejectsOrganizationWithoutOwner() {
        OrganizationMembership target = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        when(membershipRepository.findActiveByIdAndOrganizationId(2L, 41L)).thenReturn(Optional.of(target));
        when(membershipRepository.findActiveByOrganizationIdOrderByCreatedAtAsc(41L))
                .thenReturn(List.of(target));

        assertThrows(IllegalArgumentException.class,
                () -> service.transferOwnership(7L, 41L, new TransferOrganizationOwnershipRequest(2L)));
    }

    @Test
    void updateMemberRole_AssignsTheChosenRoleDefinition() {
        OrganizationMembership target = membership(2L, OrganizationRole.MEMBER, MembershipStatus.ACTIVE);
        RoleDefinition reviewerRole = reviewerRole();
        when(membershipRepository.findActiveByIdAndOrganizationId(2L, 41L)).thenReturn(Optional.of(target));
        when(workspaceAuthorizationService.organizationMemberActions(7L, 41L, target))
                .thenReturn(new MembershipActionsDto(
                        true,
                        true,
                        List.of(RoleSummaryDto.from(reviewerRole))));
        when(roleDefinitionRepository.findByIdAndOrganizationId(5L, 41L))
                .thenReturn(Optional.of(reviewerRole));
        when(membershipRepository.save(target)).thenReturn(target);

        var result = service.updateMemberRole(7L, 41L, 2L, new UpdateOrganizationMembershipRoleRequest(5L));

        assertEquals(5L, target.getRoleDefinition().getId());
        assertEquals(5L, result.roleDefinition().id());
    }

    private OrganizationMembership membership(Long id, OrganizationRole role, MembershipStatus status) {
        OrganizationMembership membership = new OrganizationMembership(organization(), user(id), orgRole(role), status);
        membership.setId(id);
        return membership;
    }

    private RoleDefinition reviewerRole() {
        RoleDefinition role = TestFixtures.role(organization(), "REVIEWER", PermissionKey.REVIEW);
        role.setId(5L);
        return role;
    }

    private RoleDefinition orgRole(OrganizationRole role) {
        return TestFixtures.role(organization(), role.name());
    }
}
